# Add CloudBackup Files to Xcode

## Steps to add CloudBackup module to Xcode project:

1. Open `ios/BlirpMe.xcworkspace` in Xcode

2. Right-click on the "BlirpMe" folder in the project navigator

3. Select "Add Files to BlirpMe..."

4. Navigate to the `ios/CloudBackup` folder

5. Select the entire CloudBackup folder

6. Make sure these options are checked:
   - ✅ Create groups
   - ✅ Add to targets: BlirpMe

7. Click "Add"

8. When prompted about configuring an Objective-C bridging header:
   - Click "Create Bridging Header" if prompted
   - If a new bridging header is created, you can delete it and use the existing `BlirpMe-Bridging-Header.h`

9. In Build Settings, verify or set:
   - Objective-C Bridging Header: `BlirpMe/BlirpMe-Bridging-Header.h`
   - Swift Language Version: 5.0

## Files that should be added:
- CloudBackup/
  - CloudBackupModule.swift
  - CloudBackupModule.m
  - Errors/
    - CloudBackupError.swift
  - Delegates/
    - PasskeyAuthorizationDelegate.swift
    - PasskeyRegistrationDelegate.swift
    - PasskeyWriteDataDelegate.swift
    - PasskeyReadDataDelegate.swift

## Verification:
1. Build the project (Cmd+B) to ensure no compilation errors
2. Check that all Swift files compile correctly
3. Verify the bridging header is properly configured