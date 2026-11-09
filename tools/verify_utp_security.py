"""Check selected AGP 9.1.1 UTP locks and observe a real instrumentation run.

Only counts and booleans leave the runner; protobufs can contain emulator JWTs.
"""

import argparse
import json
import time
from pathlib import Path
from xml.parsers import expat

PREFIX = "_internal-unified-test-platform-"
GUAVA_CONFIGS = (
    "android-device-provider-ddmlib",
    "android-driver-instrumentation",
    "android-test-plugin",
    "android-test-plugin-host-additional-test-output",
    "android-test-plugin-host-apk-installer",
    "android-test-plugin-host-coverage",
    "android-test-plugin-host-device-info",
    "android-test-plugin-host-emulator-control",
    "android-test-plugin-host-logcat",
    "android-test-plugin-result-listener-gradle",
    "core",
    "gradle-work-action",
    "launcher",
)
NETTY_MODULES = (
    "buffer",
    "codec",
    "codec-http",
    "codec-http2",
    "codec-socks",
    "common",
    "handler",
    "handler-proxy",
    "resolver",
    "transport",
    "transport-native-unix-common",
)
APP_CONFIGS = (
    "debugAndroidTestLintChecksClasspath",
    "debugLintChecksClasspath",
    "debugRuntimeClasspath",
    "debugUnitTestLintChecksClasspath",
    "debugUnitTestRuntimeClasspath",
    "releaseLintChecksClasspath",
    "releaseRuntimeClasspath",
)
PLUGIN_CLASS = (
    b"com.android.tools.utp.plugins.host.emulatorcontrol.EmulatorControlPlugin"
)
SMOKE_CLASS = "io.github.andrewdongminyoo.singbridge.UtpSmokeTest"
MAX_CONFIG_BYTES = 4 * 1024 * 1024
MAX_XML_REPORT_BYTES = 4 * 1024 * 1024
MAX_XML_TOTAL_BYTES = 16 * 1024 * 1024
MAX_XML_REPORTS = 128
MAX_CONFIG_FILES = 128
MAX_WIRE_FIELDS = 16384


def verify_lock(text):
    """Require the selected version in every repaired configuration, not requests."""
    selected = {}
    for row in text.splitlines():
        if not row or row.startswith("#"):
            continue
        coordinate, configurations = row.split("=", 1)
        if coordinate == "empty":
            continue
        group, module, version = coordinate.split(":")
        for configuration in configurations.split(","):
            key = (configuration, f"{group}:{module}")
            if key in selected and selected[key] != version:
                raise ValueError(f"Conflicting selected versions: {key}")
            selected[key] = version

    expected = {}
    for config in GUAVA_CONFIGS:
        expected[(PREFIX + config, "com.google.guava:guava")] = "33.8.0-jre"
    for config in ["core", "android-test-plugin-host-emulator-control"]:
        for module in NETTY_MODULES:
            expected[(PREFIX + config, "io.netty:netty-" + module)] = "4.1.137.Final"
    listener = PREFIX + "android-test-plugin-result-listener-gradle"
    for module in ["bcpkix-jdk18on", "bcprov-jdk18on", "bcutil-jdk18on"]:
        expected[(listener, "org.bouncycastle:" + module)] = "1.85"
    expected[(listener, "org.apache.httpcomponents:httpclient")] = "4.5.14"
    expected[(listener, "org.apache.commons:commons-lang3")] = "3.21.0"
    for key, version in expected.items():
        if selected.get(key) != version:
            raise ValueError(f"Unsafe or missing selection: {key}: expected {version}")
    for config in APP_CONFIGS:
        if selected.get((config, "com.google.guava:guava")) != "33.8.0-android":
            raise ValueError(f"App Guava Android variant missing: {config}")
    for (config, module), version in selected.items():
        if (
            module == "com.google.guava:guava"
            and not config.startswith(PREFIX)
            and version != "33.8.0-android"
        ):
            raise ValueError(f"App Guava variant changed: {config}")
    return len(expected)


def verify_results(directory):
    """Read bounded JUnit XML with DTD/entity processing explicitly disabled."""
    count = 0
    smoke_passed = False
    total_bytes = 0
    for report_number, report in enumerate(directory.rglob("TEST-*.xml"), start=1):
        if report_number > MAX_XML_REPORTS:
            raise ValueError("Instrumentation report count exceeds the limit")
        with report.open("rb") as source:
            data = source.read(MAX_XML_REPORT_BYTES + 1)
        if len(data) > MAX_XML_REPORT_BYTES:
            raise ValueError("Instrumentation report exceeds the size limit")
        total_bytes += len(data)
        if total_bytes > MAX_XML_TOTAL_BYTES:
            raise ValueError("Instrumentation aggregate report bytes exceed the limit")
        parser = expat.ParserCreate()
        suites = []

        def reject_declaration(*_args):
            raise ValueError("DTD and entity declarations are forbidden in reports")

        def start_element(name, attrs, suites=suites):
            nonlocal count, smoke_passed
            if name == "testsuite":
                if suites:
                    raise ValueError("Nested JUnit testsuites are unsupported")
                values = [attrs.get(key, "") for key in ["tests", "failures", "errors"]]
                if not all(value.isascii() and value.isdecimal() for value in values):
                    raise ValueError("JUnit suite counts must be nonnegative integers")
                tests, failures, errors = map(int, values)
                if failures or errors:
                    raise ValueError(
                        "Instrumentation report contains failures or errors"
                    )
                suites.append([tests, 0])
            elif name == "testcase":
                if not suites:
                    raise ValueError("JUnit case has no suite")
                suites[-1][1] += 1
                count += 1
                smoke_passed |= (
                    attrs.get("classname") == SMOKE_CLASS
                    and attrs.get("name") == "installedPackageHasLaunchableActivity"
                )
            elif name in {"failure", "error", "skipped"}:
                raise ValueError("Instrumentation case failed or was skipped")

        def end_element(name, suites=suites):
            if name == "testsuite":
                declared, observed = suites.pop()
                if declared != observed:
                    raise ValueError(
                        "JUnit declared test count differs from actual cases"
                    )

        parser.StartElementHandler = start_element
        parser.EndElementHandler = end_element
        parser.StartDoctypeDeclHandler = reject_declaration
        parser.EntityDeclHandler = reject_declaration
        parser.ExternalEntityRefHandler = reject_declaration
        parser.Parse(data, True)
    if not count or not smoke_passed:
        raise ValueError(
            "No passing UtpSmokeTest; NO-SOURCE is not a successful test run"
        )
    return count


def _wire_varint(data, offset):
    """Decode one canonical uint64 varint without reading beyond the message."""
    value = 0
    for index in range(10):
        if offset >= len(data):
            raise ValueError("Invalid UTP protobuf")
        byte = data[offset]
        offset += 1
        if index == 9 and byte > 1:
            raise ValueError("Invalid UTP protobuf")
        value |= (byte & 0x7F) << (index * 7)
        if not byte & 0x80:
            if index and byte == 0:
                raise ValueError("Invalid UTP protobuf")
            return value, offset
    raise ValueError("Invalid UTP protobuf")


def _wire_fields(data, budget):
    """Validate every field boundary; AGP's proto3 messages do not use groups."""
    offset = 0
    while offset < len(data):
        budget[0] += 1
        if budget[0] > MAX_WIRE_FIELDS:
            raise ValueError("Invalid UTP protobuf")
        key, offset = _wire_varint(data, offset)
        number, wire_type = key >> 3, key & 7
        if not 0 < number < 2**29:
            raise ValueError("Invalid UTP protobuf")
        value = None
        if wire_type == 0:
            _, offset = _wire_varint(data, offset)
        elif wire_type in {1, 5}:
            offset += 8 if wire_type == 1 else 4
        elif wire_type == 2:
            length, offset = _wire_varint(data, offset)
            end = offset + length
            if end > len(data):
                raise ValueError("Invalid UTP protobuf")
            value = data[offset:end]
            offset = end
        else:
            raise ValueError("Invalid UTP protobuf")
        if offset > len(data):
            raise ValueError("Invalid UTP protobuf")
        yield number, wire_type, value


def _plugin_in_runner(data, depth, budget):
    # AGP 9.1.1 selects core-proto:0.0.9-alpha04. Official Google Maven
    # core-proto sources: RunnerConfigProto.java TEST_FIXTURE=2,
    # FixtureProto.java HOST_PLUGIN=5; ExtensionProto$Extension.class
    # ConstantValue CLASS_NAME_FIELD_NUMBER=2. No arbitrary recursive byte search.
    # Exactly three message levels are traversed; opaque configs remain bytes.
    path = (2, 5, 2)
    if depth >= len(path):
        raise ValueError("Invalid UTP protobuf")
    found = False
    for number, wire_type, value in _wire_fields(data, budget):
        if number != path[depth]:
            continue
        if wire_type != 2:
            raise ValueError("Invalid UTP protobuf")
        if depth == 2:
            # class_name is singular: a subsequent value replaces the first.
            found = value == PLUGIN_CLASS
        else:
            found |= _plugin_in_runner(value, depth + 1, budget)
    return found


def has_emulator_control(config):
    """Observe a bounded, structurally valid RunnerConfig without exposing JWTs."""
    try:
        with config.open("rb") as source:
            data = source.read(MAX_CONFIG_BYTES + 1)
    except FileNotFoundError:
        return False  # Gradle deletes temporary configs on worker exit.
    if len(data) > MAX_CONFIG_BYTES:
        raise ValueError("UTP runner config exceeds the size limit")
    try:
        return _plugin_in_runner(memoryview(data), 0, [0])
    except ValueError:
        # A writer may not have finished. Retry at the next poll, never count it.
        return False


def _runner_configs(directory):
    configs = set()
    for config in directory.glob("runnerConfig*.pb"):
        configs.add(config)
        if len(configs) > MAX_CONFIG_FILES:
            raise ValueError("UTP runner config count exceeds the limit")
    return configs


def verify_discovery(directory, serial):
    """Require AGP's matching emulator JWT discovery metadata without printing it."""
    for metadata in directory.glob("pid_*.ini"):
        fields = dict(
            line.split("=", 1)
            for line in metadata.read_text().splitlines()
            if "=" in line
        )
        if "emulator-" + fields.get("port.serial", "") != serial:
            continue
        if (
            fields.get("grpc.port", "").isascii()
            and fields.get("grpc.port", "").isdecimal()
            and 0 < int(fields["grpc.port"]) < 65536
            and fields.get("grpc.jwks")
            and Path(fields["grpc.jwks"]).is_dir()
            and fields.get("grpc.allowlist")
            and Path(fields["grpc.allowlist"]).is_file()
        ):
            return
    raise ValueError("Matching emulator JWT/allowlist discovery metadata is missing")


def observe_instrumentation(
    utp_directory, results_directory, completion, ready, timeout_seconds
):
    """Observe fresh configs until the CI shell reports Gradle's actual exit code.

    AGP 9.1.1 UtpRunner keeps runnerConfig*.pb until worker deleteOnExit.
    Polling can miss a file that exists for less than 50 ms; that fails closed
    as a missing observation. Real instrumentation must produce an observed
    valid config and passing JUnit, regardless of these controlled fixtures.
    """
    if completion.exists() or ready.exists():
        raise ValueError("Use fresh instrumentation completion and readiness markers")
    if next(results_directory.rglob("TEST-*.xml"), None) is not None:
        raise ValueError("Use a clean instrumentation result directory")
    previous = _runner_configs(utp_directory)
    plugin_seen = False
    deadline = time.monotonic() + timeout_seconds
    ready.touch()
    while True:
        for config in _runner_configs(utp_directory) - previous:
            plugin_seen |= has_emulator_control(config)
        if completion.exists():
            if completion.read_text().strip() != "0":
                raise ValueError("Instrumentation command failed")
            break
        if time.monotonic() >= deadline:
            raise ValueError("Instrumentation observation timed out")
        time.sleep(0.05)
    if not plugin_seen:
        raise ValueError(
            "EmulatorControlPlugin was absent from the executed UTP config"
        )
    return verify_results(results_directory)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("androidApp/gradle.lockfile"))
    parser.add_argument(
        "--utp-directory", type=Path, default=Path.home() / ".android/utp"
    )
    parser.add_argument(
        "--results",
        type=Path,
        default=Path("androidApp/build/outputs/androidTest-results/connected"),
    )
    parser.add_argument("--summary", type=Path)
    parser.add_argument("--junit-summary", type=Path)
    parser.add_argument("--emulator-discovery", type=Path)
    parser.add_argument("--serial", default="emulator-5554")
    parser.add_argument("--observe-until", type=Path)
    parser.add_argument("--ready", type=Path)
    parser.add_argument("--timeout", type=int, default=1200)
    args = parser.parse_args()
    try:
        selections = verify_lock(args.lock.read_text())
        summary = {
            "safe_utp_selections": selections,
            "app_guava_android_preserved": True,
        }
        if args.emulator_discovery:
            verify_discovery(args.emulator_discovery, args.serial)
            summary["emulator_jwt_metadata_present"] = True
        if args.observe_until:
            if not args.ready or args.timeout <= 0:
                raise ValueError(
                    "Observation requires a readiness marker and positive timeout"
                )
            summary["passing_tests"] = observe_instrumentation(
                args.utp_directory,
                args.results,
                args.observe_until,
                args.ready,
                args.timeout,
            )
            summary["emulator_control_plugin_observed"] = True
        if args.junit_summary and args.observe_until:
            # This fixed report excludes all raw instrumentation properties and tokens.
            args.junit_summary.parent.mkdir(parents=True, exist_ok=True)
            args.junit_summary.write_text(
                '<?xml version="1.0" encoding="utf-8"?>\n'
                '<testsuite name="utp-security" tests="1" failures="0" errors="0">'
                f'<testcase classname="{SMOKE_CLASS}" name="installedPackageHasLaunchableActivity"/>'
                "</testsuite>\n"
            )
        if args.summary:
            args.summary.parent.mkdir(parents=True, exist_ok=True)
            args.summary.write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, sort_keys=True))
    except (OSError, ValueError, expat.ExpatError) as error:
        parser.exit(1, f"UTP security gate failed: {error}\n")


if __name__ == "__main__":
    main()
