#!/usr/bin/env python3
"""
Adds V5 Swift files to Xcode project and builds.
"""

import os
import re
import uuid
import subprocess
import shutil

PROJECT_DIR = "Redi"
PROJECT_NAME = "Redi"
PBXPROJ_PATH = f"{PROJECT_DIR}/{PROJECT_NAME}.xcodeproj/project.pbxproj"

V5_FILES = [
    ("V5/Config/V5Config.swift", "V5Config.swift"),
    ("V5/Services/V5AudioService.swift", "V5AudioService.swift"),
    ("V5/Services/V5WebSocketService.swift", "V5WebSocketService.swift"),
    ("V5/Views/V5MainView.swift", "V5MainView.swift"),
]

def generate_uuid():
    return uuid.uuid4().hex[:24].upper()

def main():
    print("=" * 50)
    print("REDI iOS PROJECT SYNC")
    print("=" * 50)

    if not os.path.exists(PBXPROJ_PATH):
        print(f"ERROR: Cannot find {PBXPROJ_PATH}")
        return 1

    # Read project file
    with open(PBXPROJ_PATH, 'r') as f:
        content = f.read()

    # Backup
    shutil.copy(PBXPROJ_PATH, PBXPROJ_PATH + ".backup")
    print(f"Created backup: {PBXPROJ_PATH}.backup")

    # Check and add each file
    files_added = 0
    for relative_path, filename in V5_FILES:
        full_path = f"{PROJECT_DIR}/{relative_path}"

        if not os.path.exists(full_path):
            print(f"SKIP: {filename} not on disk")
            continue

        if filename in content:
            print(f"OK: {filename} already in project")
            continue

        print(f"ADDING: {filename}...")

        file_ref_uuid = generate_uuid()
        build_file_uuid = generate_uuid()

        # Add PBXFileReference - use full path from project root
        file_ref = f'\t\t{file_ref_uuid} /* {filename} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {relative_path}; sourceTree = "<group>"; }};\n'
        content = re.sub(
            r'(/\* End PBXFileReference section \*/)',
            file_ref + r'\1',
            content
        )

        # Add PBXBuildFile
        build_file = f'\t\t{build_file_uuid} /* {filename} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_ref_uuid} /* {filename} */; }};\n'
        content = re.sub(
            r'(/\* End PBXBuildFile section \*/)',
            build_file + r'\1',
            content
        )

        # Add to Sources build phase
        content = re.sub(
            r'(/\* Sources \*/ = \{[^}]*files = \()([^)]*)',
            r'\1\2\n\t\t\t\t' + build_file_uuid + ' /* ' + filename + ' in Sources */,',
            content
        )

        files_added += 1
        print(f"  Added {filename}")

    # Write if changes made
    if files_added > 0:
        with open(PBXPROJ_PATH, 'w') as f:
            f.write(content)
        print(f"\nUpdated project with {files_added} files")
    else:
        print("\nNo files needed adding")

    # Clean derived data
    print("\nCleaning Xcode caches...")
    derived_data = os.path.expanduser("~/Library/Developer/Xcode/DerivedData")
    if os.path.exists(derived_data):
        for item in os.listdir(derived_data):
            if "Redi" in item:
                shutil.rmtree(os.path.join(derived_data, item))
                print(f"  Removed: {item}")

    # Build
    print("\nBuilding project...")

    cmd = f"xcodebuild -project {PROJECT_DIR}/{PROJECT_NAME}.xcodeproj -scheme {PROJECT_NAME} -destination 'platform=iOS Simulator,name=iPhone 16' clean build 2>&1"

    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    output = result.stdout + result.stderr

    # Show last 30 lines
    lines = output.strip().split('\n')
    print("\nBuild output (last 30 lines):")
    for line in lines[-30:]:
        print(f"  {line}")

    if result.returncode == 0:
        print("\n✅ BUILD SUCCEEDED")
    else:
        print("\n❌ BUILD FAILED")

    return result.returncode

if __name__ == "__main__":
    exit(main())
