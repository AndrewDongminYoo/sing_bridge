"""Offline regression fixtures for the AGP 9.1.1 UTP security gate."""

import contextlib
import io
import json
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

import verify_utp_security as guard

# These are the actual selected configurations in the PR 107 baseline lockfile.
GUAVA_CONFIGS = [
    "android-driver-instrumentation",
    "android-test-plugin",
    "core",
    "launcher",
    "android-device-provider-ddmlib",
    "android-test-plugin-host-additional-test-output",
    "android-test-plugin-host-apk-installer",
    "android-test-plugin-host-coverage",
    "android-test-plugin-host-device-info",
    "android-test-plugin-host-emulator-control",
    "android-test-plugin-host-logcat",
    "android-test-plugin-result-listener-gradle",
    "gradle-work-action",
]
NETTY_MODULES = [
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
]
PREFIX = "_internal-unified-test-platform-"
APP_CONFIGS = (
    "debugAndroidTestLintChecksClasspath,debugLintChecksClasspath,debugRuntimeClasspath,"
    "debugUnitTestLintChecksClasspath,debugUnitTestRuntimeClasspath,"
    "releaseLintChecksClasspath,releaseRuntimeClasspath"
)


# core-proto:0.0.9-alpha04: RunnerConfig.test_fixture(2),
# TestFixture.host_plugin(5), Extension.class_name(2); canonical wire bytes.
VALID_RUNNER_CONFIG = (
    b"\x12\x4c\x2a\x4a\x12\x48"
    b"com.android.tools.utp.plugins.host.emulatorcontrol.EmulatorControlPlugin"
)
PASSING_SUITE = (
    '<testsuite tests="1" failures="0" errors="0"><testcase '
    'classname="io.github.andrewdongminyoo.singbridge.UtpSmokeTest" '
    'name="installedPackageHasLaunchableActivity"/></testsuite>'
)


def complete_atomically(completion, code):
    pending = completion.with_suffix(".pending")
    pending.write_text(code)
    pending.rename(completion)


def baseline_lock():
    rows = []
    for index, config in enumerate(GUAVA_CONFIGS):
        old = "32.0.1-jre" if index < 4 else "33.3.1-jre"
        rows.append(f"com.google.guava:guava:{old}={PREFIX}{config}")
    for module in NETTY_MODULES:
        for config, old in [
            ("core", "4.1.93.Final"),
            ("android-test-plugin-host-emulator-control", "4.1.110.Final"),
        ]:
            rows.append(f"io.netty:netty-{module}:{old}={PREFIX}{config}")
    listener = PREFIX + "android-test-plugin-result-listener-gradle"
    for module in ["bcpkix-jdk18on", "bcprov-jdk18on", "bcutil-jdk18on"]:
        rows.append(f"org.bouncycastle:{module}:1.79={listener}")
    rows.extend(
        [
            f"org.apache.httpcomponents:httpclient:4.5.6={listener}",
            f"org.apache.commons:commons-lang3:3.16.0={listener}",
            f"com.google.guava:guava:33.8.0-android={APP_CONFIGS}",
        ]
    )
    return "\n".join(rows) + "\n"


def repaired_lock():
    text = baseline_lock()
    for old, new in [
        ("32.0.1-jre", "33.8.0-jre"),
        ("33.3.1-jre", "33.8.0-jre"),
        ("4.1.93.Final", "4.1.137.Final"),
        ("4.1.110.Final", "4.1.137.Final"),
        (":1.79=", ":1.85="),
        (":4.5.6=", ":4.5.14="),
        (":3.16.0=", ":3.21.0="),
    ]:
        text = text.replace(old, new)
    return text


class LockGateTest(unittest.TestCase):
    def test_actual_vulnerable_baseline_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "com.google.guava:guava"):
            guard.verify_lock(baseline_lock())

    def test_safe_selected_versions_and_android_app_variant_pass(self):
        self.assertEqual(guard.verify_lock(repaired_lock()), 40)

    def test_each_missing_configuration_or_old_selection_is_rejected(self):
        rows = repaired_lock().splitlines()
        for index, row in enumerate(rows[:-1]):
            with self.subTest(row=row), self.assertRaises(ValueError):
                guard.verify_lock("\n".join(rows[:index] + rows[index + 1 :]))
        with self.assertRaises(ValueError):
            guard.verify_lock(
                repaired_lock().replace("4.1.137.Final", "4.1.110.Final", 1)
            )

    def test_jre_variant_cannot_leak_into_app(self):
        with self.assertRaises(ValueError):
            guard.verify_lock(repaired_lock().replace("33.8.0-android", "33.8.0-jre"))

    def test_android_variant_cannot_replace_host_jre(self):
        with self.assertRaises(ValueError):
            guard.verify_lock(repaired_lock().replace("33.8.0-jre", "33.8.0-android"))

    def test_missing_app_runtime_configuration_is_rejected(self):
        with self.assertRaises(ValueError):
            guard.verify_lock(repaired_lock().replace("debugRuntimeClasspath,", ""))

    def test_conflicting_selection_is_rejected(self):
        with self.assertRaises(ValueError):
            guard.verify_lock(
                repaired_lock() + f"com.google.guava:guava:32.0.1-jre={PREFIX}core\n"
            )


class RuntimeGateTest(unittest.TestCase):
    def test_nonzero_passing_smoke_test_is_required(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(ValueError):
                guard.verify_results(root)
            report = root / "TEST-emulator.xml"
            for xml in [
                '<testsuite tests="0" failures="0" errors="0"/>',
                '<testsuite tests="1" failures="1" errors="0"><testcase><failure/></testcase></testsuite>',
                '<testsuite tests="1" failures="0" errors="0"><testcase><skipped/></testcase></testsuite>',
                '<testsuite tests="1" failures="0" errors="0"><testcase classname="Other" name="test"/></testsuite>',
            ]:
                report.write_text(xml)
                with self.assertRaises(ValueError):
                    guard.verify_results(root)
            report.write_text(
                '<testsuite tests="1" failures="0" errors="0"><testcase '
                'classname="io.github.andrewdongminyoo.singbridge.UtpSmokeTest" '
                'name="installedPackageHasLaunchableActivity"/></testsuite>'
            )
            self.assertEqual(guard.verify_results(root), 1)

    def test_runtime_observer_requires_fresh_plugin_and_successful_completion(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            utp = root / "utp"
            utp.mkdir()
            results = root / "results"
            results.mkdir()
            completed = root / "completed"
            ready = root / "ready"

            def simulate_instrumentation():
                while not ready.exists():
                    time.sleep(0.01)
                config = utp / "runnerConfig123.pb"
                config.write_bytes(VALID_RUNNER_CONFIG)
                (results / "TEST-emulator.xml").write_text(
                    '<testsuite tests="1" failures="0" errors="0">'
                    '<testcase classname="io.github.andrewdongminyoo.singbridge.UtpSmokeTest" '
                    'name="installedPackageHasLaunchableActivity"/></testsuite>'
                )
                time.sleep(0.2)
                config.unlink()
                complete_atomically(completed, "0")

            writer = threading.Thread(target=simulate_instrumentation, daemon=True)
            writer.start()
            self.assertEqual(
                guard.observe_instrumentation(utp, results, completed, ready, 2), 1
            )
            writer.join(timeout=2)
            self.assertFalse(writer.is_alive())
            with self.assertRaisesRegex(ValueError, "fresh"):
                guard.observe_instrumentation(utp, results, completed, ready, 1)

    def test_runtime_observer_rejects_timeout_failure_and_missing_plugin(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            completed = root / "completed"
            ready = root / "ready"
            with self.assertRaisesRegex(ValueError, "timed out"):
                guard.observe_instrumentation(root, root, completed, ready, 0.01)
            ready.unlink()

            def finish():
                while not ready.exists():
                    time.sleep(0.01)
                complete_atomically(completed, "2")

            writer = threading.Thread(target=finish, daemon=True)
            writer.start()
            with self.assertRaisesRegex(ValueError, "command failed"):
                guard.observe_instrumentation(root, root, completed, ready, 2)
            writer.join(timeout=2)
            completed.unlink()
            ready.unlink()

            def finish_without_plugin():
                while not ready.exists():
                    time.sleep(0.01)
                complete_atomically(completed, "0")

            writer = threading.Thread(target=finish_without_plugin, daemon=True)
            writer.start()
            with self.assertRaisesRegex(ValueError, "absent"):
                guard.observe_instrumentation(root, root, completed, ready, 2)
            writer.join(timeout=2)

    def test_junit_forbids_dtd_entities_and_inconsistent_counts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            report = root / "TEST-emulator.xml"
            for xml in [
                '<!DOCTYPE testsuite [<!ENTITY injected "value">]><testsuite/>',
                '<testsuite tests="private" failures="0" errors="0"/>',
                (
                    '<testsuite tests="0" failures="0" errors="0"><testcase '
                    'classname="io.github.andrewdongminyoo.singbridge.UtpSmokeTest" '
                    'name="installedPackageHasLaunchableActivity"/></testsuite>'
                ),
            ]:
                report.write_text(xml)
                with self.assertRaises(ValueError):
                    guard.verify_results(root)

    def test_cli_exports_only_sanitized_junit_and_boolean_count_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            lock = root / "gradle.lockfile"
            lock.write_text(repaired_lock())
            utp = root / "utp"
            utp.mkdir()
            results = root / "results"
            results.mkdir()
            ready = root / "ready"
            completed = root / "completed"
            summary = root / "summary.json"
            junit = root / "sanitized.xml"
            private_value = "fixture-private-auth-value"

            def emit_private_runner_outputs():
                while not ready.exists():
                    time.sleep(0.01)
                # The private value is a valid unrelated RunnerConfig field 12.
                (utp / "runnerConfig123.pb").write_bytes(
                    VALID_RUNNER_CONFIG
                    + b"\x62"
                    + bytes([len(private_value)])
                    + private_value.encode()
                )
                (results / "TEST-emulator.xml").write_text(
                    '<testsuite tests="1" failures="0" errors="0"><properties>'
                    f'<property name="grpc.token" value="{private_value}"/></properties>'
                    '<testcase classname="io.github.andrewdongminyoo.singbridge.UtpSmokeTest" '
                    'name="installedPackageHasLaunchableActivity"/></testsuite>'
                )
                pending = root / "pending"
                pending.write_text("0")
                pending.rename(completed)

            writer = threading.Thread(target=emit_private_runner_outputs, daemon=True)
            writer.start()
            output = io.StringIO()
            argv = [
                "verify_utp_security.py",
                "--lock",
                str(lock),
                "--utp-directory",
                str(utp),
                "--results",
                str(results),
                "--observe-until",
                str(completed),
                "--ready",
                str(ready),
                "--summary",
                str(summary),
                "--junit-summary",
                str(junit),
                "--timeout",
                "2",
            ]
            with mock.patch.object(sys, "argv", argv), contextlib.redirect_stdout(
                output
            ):
                guard.main()
            writer.join(timeout=2)
            self.assertFalse(writer.is_alive())
            self.assertEqual(
                json.loads(summary.read_text()),
                {
                    "safe_utp_selections": 40,
                    "app_guava_android_preserved": True,
                    "passing_tests": 1,
                    "emulator_control_plugin_observed": True,
                },
            )
            self.assertIn('tests="1" failures="0" errors="0"', junit.read_text())
            for text in [output.getvalue(), summary.read_text(), junit.read_text()]:
                self.assertNotIn(private_value, text)
                self.assertNotIn("grpc.token", text)

    def test_discovery_requires_matching_serial_and_jwt_allowlist(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            metadata = root / "pid_123.ini"
            metadata.write_text("port.serial=5556\ngrpc.port=8554\n")
            with self.assertRaises(ValueError):
                guard.verify_discovery(root, "emulator-5554")
            metadata.write_text(
                "port.serial=5554\ngrpc.port=8554\ngrpc.token=private\n"
            )
            with self.assertRaises(ValueError):
                guard.verify_discovery(root, "emulator-5554")
            jwks = root / "jwks"
            jwks.mkdir()
            allowlist = root / "allowlist.json"
            allowlist.write_text("{}")
            metadata.write_text(
                f"port.serial=5554\ngrpc.port=8554\ngrpc.jwks={jwks}\ngrpc.allowlist={allowlist}\n"
            )
            guard.verify_discovery(root, "emulator-5554")

    def test_config_requires_plugin_in_exact_descriptor_field_path(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "runnerConfig1.pb"
            for data in [
                b"unrelated emulator-control metadata",
                b"garbage" + VALID_RUNNER_CONFIG,
                VALID_RUNNER_CONFIG + b"\x80",  # truncated trailing tag
                b"\x12\x48" + VALID_RUNNER_CONFIG[6:],  # class_name at the root
                b"\x0a\x4c" + VALID_RUNNER_CONFIG[2:],  # device, not test_fixture
                b"\x12\x4c\x1a\x4a" + VALID_RUNNER_CONFIG[4:],  # setup, not host_plugin
                b"\x12\x4c\x2a\x4a\x1a\x48"
                + VALID_RUNNER_CONFIG[6:],  # jar, not class_name
                b"\x00",
                b"\x0e",
                b"\x0b",  # invalid field/wire type and unsupported groups
                b"\x80" * 11,  # unbounded varint
                b"\x12\xff\xff\xff\xff\x7f",  # out-of-bounds length
            ]:
                config.write_bytes(data)
                with self.subTest(data_length=len(data)):
                    self.assertFalse(guard.has_emulator_control(config))
            config.write_bytes(VALID_RUNNER_CONFIG)
            self.assertTrue(guard.has_emulator_control(config))
            # All ordinary wire types and an unrelated byte field can follow the plugin.
            config.write_bytes(
                VALID_RUNNER_CONFIG
                + b"\x80\x01\x01\x89\x01"
                + b"0" * 8
                + b"\x92\x01\x01x\x9d\x01"
                + b"0" * 4
            )
            self.assertTrue(guard.has_emulator_control(config))
            # Protobuf singular fields use the final occurrence, not any matching substring.
            config.write_bytes(
                b"\x12\x50\x2a\x4e" + VALID_RUNNER_CONFIG[4:] + b"\x12\x02no"
            )
            self.assertFalse(guard.has_emulator_control(config))

    def test_positive_empty_report_and_nested_suites_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "TEST-valid.xml").write_text(PASSING_SUITE)
            extra = root / "TEST-empty.xml"
            extra.write_text('<testsuite tests="1" failures="0" errors="0"/>')
            with self.assertRaisesRegex(ValueError, "declared test count"):
                guard.verify_results(root)
            extra.write_text(
                '<testsuite tests="1" failures="0" errors="0">'
                + PASSING_SUITE
                + "</testsuite>"
            )
            with self.assertRaisesRegex(ValueError, "Nested"):
                guard.verify_results(root)

    def test_config_size_and_wire_field_count_are_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            config = Path(directory) / "runnerConfig1.pb"
            config.write_bytes(VALID_RUNNER_CONFIG + b"x" * (4 * 1024 * 1024))
            with self.assertRaisesRegex(ValueError, "size limit"):
                guard.has_emulator_control(config)
            config.write_bytes(b"\x08\x00" * 20000 + VALID_RUNNER_CONFIG)
            self.assertFalse(guard.has_emulator_control(config))

    def test_xml_report_count_and_aggregate_bytes_are_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index in range(129):
                (root / f"TEST-{index}.xml").write_text(PASSING_SUITE)
            with self.assertRaisesRegex(ValueError, "report count"):
                guard.verify_results(root)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            padding = " " * (3 * 1024 * 1024)
            for index in range(6):
                (root / f"TEST-{index}.xml").write_text(PASSING_SUITE + padding)
            with self.assertRaisesRegex(ValueError, "aggregate"):
                guard.verify_results(root)


if __name__ == "__main__":
    unittest.main()
