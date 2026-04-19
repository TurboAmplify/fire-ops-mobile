# iOS Permission Strings (Info.plist)

Apple **auto-rejects** apps that use the camera or photo library without
permission usage descriptions. FireOps HQ uses the camera in many places
(receipts, truck photos, inspection photos, crew portraits, signatures,
agreements, resource orders).

After running `npx cap add ios` and before your first Xcode build, open:

```
ios/App/App/Info.plist
```

…and add the following entries inside the top-level `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>FireOps HQ uses the camera to capture receipts, truck photos, inspection photos, crew portraits, and signed documents in the field.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>FireOps HQ accesses your photo library so you can attach existing receipts, truck photos, inspection photos, and operational documents.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>FireOps HQ saves shift ticket PDFs and receipt copies to your photo library when you choose to export them.</string>
```

## Why each one is required

| Key | Required because |
|-----|------------------|
| `NSCameraUsageDescription` | Capacitor Camera plugin (used in Expenses, Fleet, Crew, Inspections, Shift Tickets) |
| `NSPhotoLibraryUsageDescription` | Selecting existing images for receipts, truck photos, documents |
| `NSPhotoLibraryAddUsageDescription` | Saving generated PDFs (OF-297 shift tickets) back to the device |

## Verification before submitting to App Store Connect

1. Build the iOS app in Xcode.
2. On a physical device, trigger each camera flow — confirm the prompt shows
   the exact text from `Info.plist`.
3. Check **App Store Connect → App Privacy** matches what you collect:
   - Photos / Camera (functionality)
   - Email address (account)
   - User content (operational data)
4. Confirm the Privacy Policy URL in App Store Connect points to `/privacy`
   on the live domain.
