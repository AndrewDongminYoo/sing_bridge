#!/usr/bin/env bash

# Linux Android setup for hosted containers.
#
# This script supports Linux x86_64 only. Android Build Tools 36.0.0 has no
# published Linux arm64 archive. It reuses an existing JDK and Android SDK when
# available, and otherwise installs the required Android SDK packages locally.

set -euo pipefail

readonly ANDROID_API_LEVEL="36"
readonly ANDROID_BUILD_TOOLS_VERSION="36.0.0"
readonly COMMAND_LINE_TOOLS_VERSION="16111833"
readonly COMMAND_LINE_TOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-16111833_latest.zip"
readonly COMMAND_LINE_TOOLS_SHA256="0877a1d048fe4a24efe2eff536ca4223f7adeb58648bb81909d33c446918cfa8"

fail() {
  printf 'setup.sh: %s\n' "$*" >&2
  exit 1
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "missing command: $1"
  fi
}

sdk_is_complete() {
  [[ -f "$1/platforms/android-$ANDROID_API_LEVEL/android.jar" && -f "$1/platforms/android-$ANDROID_API_LEVEL/package.xml" && -x "$1/build-tools/$ANDROID_BUILD_TOOLS_VERSION/aapt2" && -f "$1/build-tools/$ANDROID_BUILD_TOOLS_VERSION/package.xml" ]]
}

find_sdk_root() {
  if [[ -n "${ANDROID_HOME:-}" && -n "${ANDROID_SDK_ROOT:-}" && "$ANDROID_HOME" != "$ANDROID_SDK_ROOT" ]]; then
    fail "ANDROID_HOME and ANDROID_SDK_ROOT must name the same directory"
  fi

  if [[ -n "${ANDROID_HOME:-}" ]]; then
    printf '%s\n' "$ANDROID_HOME"
    return
  fi

  if [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    printf '%s\n' "$ANDROID_SDK_ROOT"
    return
  fi

  local sdk_candidate
  for sdk_candidate in /opt/android-sdk /usr/local/lib/android/sdk; do
    if [[ -d "$sdk_candidate" ]]; then
      printf '%s\n' "$sdk_candidate"
      return
    fi
  done

  printf '%s/.android-sdk\n' "$repo_root"
}

bootstrap_command_line_tools() {
  local archive_path="$sdk_root/commandlinetools-linux-${COMMAND_LINE_TOOLS_VERSION}.zip"
  local command_line_tools_root="$sdk_root/cmdline-tools"
  local extracted_tools_root="$command_line_tools_root/cmdline-tools"

  require_command curl
  require_command mkdir
  require_command mv
  require_command rm
  require_command sha256sum
  require_command unzip

  if [[ -e "$command_line_tools_root/latest" ]]; then
    fail "Android command-line tools are incomplete at $command_line_tools_root/latest; remove that directory before rerunning"
  fi

  mkdir -p "$command_line_tools_root"
  curl --fail --show-error --location --proto '=https' --tlsv1.2 --output "$archive_path" "$COMMAND_LINE_TOOLS_URL"
  printf '%s  %s\n' "$COMMAND_LINE_TOOLS_SHA256" "$archive_path" | sha256sum --check --status || fail "checksum verification failed for Android command-line tools $COMMAND_LINE_TOOLS_VERSION"
  unzip -q "$archive_path" -d "$command_line_tools_root"
  rm -f "$archive_path"

  if [[ ! -d "$extracted_tools_root" ]]; then
    fail "Android command-line tools archive did not contain cmdline-tools"
  fi

  mv "$extracted_tools_root" "$command_line_tools_root/latest"
}

install_android_sdk_packages() {
  local sdkmanager_path="$sdk_root/cmdline-tools/latest/bin/sdkmanager"
  local sdkmanager_status

  if [[ ! -x "$sdkmanager_path" ]]; then
    bootstrap_command_line_tools
  fi

  if [[ ! -x "$sdkmanager_path" ]]; then
    fail "missing executable: $sdkmanager_path"
  fi

  require_command yes
  set +o pipefail
  yes | "$sdkmanager_path" --sdk_root="$sdk_root" --licenses
  sdkmanager_status=${PIPESTATUS[1]}
  set -o pipefail
  if (( sdkmanager_status != 0 )); then
    fail "Android SDK license acceptance failed"
  fi

  "$sdkmanager_path" --sdk_root="$sdk_root" --install "platforms;android-$ANDROID_API_LEVEL" "build-tools;$ANDROID_BUILD_TOOLS_VERSION"
}

script_path=${BASH_SOURCE[0]}
if [[ "$script_path" == */* ]]; then
  script_directory=${script_path%/*}
else
  script_directory=.
fi
repo_root=$(cd "$script_directory" && pwd -P)

require_command java
require_command javac
require_command uname

java_version_output=$(java -version 2>&1)
if [[ ! "$java_version_output" =~ version\ \"([0-9]+) ]]; then
  fail "could not determine the JDK version from java -version"
fi
jdk_major=${BASH_REMATCH[1]}
if (( jdk_major < 17 || jdk_major > 25 )); then
  fail "JDK $jdk_major is unsupported; Gradle 9.3.1 requires JDK 17 through 25"
fi
java -version
javac -version

if [[ -n "${JAVA_HOME:-}" ]]; then
  java_home_command="$JAVA_HOME/bin/java"
  if [[ ! -x "$java_home_command" ]]; then
    fail "JAVA_HOME does not contain an executable java: $java_home_command"
  fi
  java_home_version_output=$("$java_home_command" -version 2>&1)
  if [[ "$java_home_version_output" != "$java_version_output" ]]; then
    fail "JAVA_HOME does not select the java command validated by setup.sh"
  fi
fi

operating_system=$(uname -s)
if [[ "$operating_system" != "Linux" ]]; then
  fail "unsupported operating system: $operating_system; setup.sh supports hosted Linux containers only"
fi

architecture=$(uname -m)
case "$architecture" in
  x86_64 | amd64) ;;
  *) fail "unsupported architecture: $architecture; Android Build Tools $ANDROID_BUILD_TOOLS_VERSION requires a Linux x86_64 hosted container" ;;
esac

sdk_root=$(find_sdk_root)

if ! sdk_is_complete "$sdk_root"; then
  require_command mkdir
  if [[ ! -d "$sdk_root" ]]; then
    mkdir -p "$sdk_root"
  fi
  if [[ ! -w "$sdk_root" ]]; then
    fail "Android SDK directory is not writable: $sdk_root"
  fi
  install_android_sdk_packages
fi

if ! sdk_is_complete "$sdk_root"; then
  fail "Android SDK setup did not provide platforms;android-$ANDROID_API_LEVEL and build-tools;$ANDROID_BUILD_TOOLS_VERSION"
fi

environment_file="$repo_root/.singbridge-env"
printf 'export ANDROID_HOME=%q\nexport ANDROID_SDK_ROOT=%q\n' "$sdk_root" "$sdk_root" > "$environment_file"
if [[ -x "$sdk_root/cmdline-tools/latest/bin/sdkmanager" ]]; then
  path_variable="\$PATH"
  printf 'export PATH=%q:%s\n' "$sdk_root/cmdline-tools/latest/bin" "$path_variable" >> "$environment_file"
fi
printf 'Android SDK ready at %s\n' "$sdk_root"
printf 'For later shells, run: source ./.singbridge-env\n'
