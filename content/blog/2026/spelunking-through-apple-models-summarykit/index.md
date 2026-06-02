---
title: Spelunking through Apple's safety models - ClientSafetyConfiguration and SummarizationKit
date: "2026-04-05T01:02:45.000Z"
description: We take a deep dive into the Apple SummarizationKit model which applies safety classification and summarization to text across several Apple products such as Notes, Mail, Messages, and Safari. We'll also reverse engineer the encrypted safety configuration files which contain a number of country-specific text summarization rules around politcs, stop words, and more.
tags: ["reverse-engineering", "apple"]
published: false
---

# Finding the configuration files

I started by running `fs_usage` to see what kind of files were being accessed when I triggered summarization in the Notes app. A couple of paths caught my eye:

```bash command
sudo fs_usage -w -f filesys | grep -i safety
```
```bash output
19:41:01.285622  stat64                                 /System/Library/AssetsV2/com_apple_MobileAsset_UAF_FM_Overrides/purpose_auto/4b6103270669db6c18c7db52de8a466cc3bcd1ed.asset/AssetData                                 0.000003   GenerativeExperiencesSafetyInfer.11988643
19:41:01.285708  stat64                                 ary/AssetsV2/locks/com.apple.UnifiedAssetFramework/com.apple.MobileAsset.UAF.FM.Overrides/shared_locks/atomic_instance_3EEBCF9B-B245-4218-B810-D18DF18D77E3.locker    0.000003   GenerativeExperiencesSafetyInfer.11988643
19:41:01.285715  close             F=3                                                                                                                                                                                        0.000006   GenerativeExperiencesSafetyInfer.11988643
19:41:01.285912  close             F=4                                                                                                                                                                                        0.000042   GenerativeExperiencesSafetyInfer.12349812
19:41:03.119508  open              F=9        (R_____N________)  apple_MobileAsset_UAF_SummarizationKitConfiguration/purpose_auto/f46a9f714d900cc628bc5c42f704d7d6e68fcd29.asset/AssetData/ClientSafetyConfiguration.pbtxt    0.000066   generativeexperiencesd.12349901
19:41:03.119669    RdData[A]       D=0x003a6a3d  B=0x7000   /dev/disk3s5  ileAsset_UAF_SummarizationKitConfiguration/purpose_auto/f46a9f714d900cc628bc5c42f704d7d6e68fcd29.asset/AssetData/ClientSafetyConfiguration.pbtxt    0.000155 W generativeexperi.12349901
19:41:03.119964  stat64                                 A/Resources/OTAConfiguration/ClientSafetyConfiguration.pbtxt                                                                                                          0.000009   generativeexperiencesd.12349901
19:41:03.119969  lstat64                                A/Resources/OTAConfiguration/ClientSafetyConfiguration.pbtxt                                                                                                          0.000004   generativeexperiencesd.12349901
19:41:03.120066  open              F=9        (R_____N________)  A/Resources/OTAConfiguration/ClientSafetyConfiguration.pbtxt                                                                                                 0.000093   generativeexperiencesd.12349901
19:41:03.120229    RdData[A]       D=0x00fd1557  B=0x7000   /dev/disk3s1s1  A/Resources/OTAConfiguration/ClientSafetyConfiguration.pbtxt                                                                                      0.000153 W generativeexperi.12349901
19:41:03.197048  open              F=3        (R_____Nl_______)  sV2/locks/com.apple.UnifiedAssetFramework/com.apple.MobileAsset.UAF.FM.Overrides/shared_locks/atomic_instance_3EEBCF9B-B245-4218-B810-D18DF18D77E3.locker    0.000097   GenerativeExperiencesSafetyInfer.11988643
19:41:03.197472  getattrlist            [  2]           /System/Library/UnifiedAssetFramework/MinVersions                                                                                                                     0.000004   GenerativeExperiencesSafetyInfer.11988643
19:41:03.197480  getattrlist            [  2]           /System/Library/UnifiedAssetFramework/MinVersions                                                                                                                     0.000001   GenerativeExperiencesSafetyInfer.11988643
19:41:03.197641  open              F=4        (R_____Nl_______)  sV2/locks/com.apple.UnifiedAssetFramework/com.apple.MobileAsset.UAF.FM.Overrides/shared_locks/atomic_instance_3EEBCF9B-B245-4218-B810-D18DF18D77E3.locker    0.000061   GenerativeExperiencesSafetyInfer.11988643
```

It seems like there are two main types of files being accessed here. The first is the `FM_Overrides` which is a deny list of terms that are blocked from being summarized. The second is a binary called `generativeexperiencesd` which opens some pbtxt files related to safety. Searching for these files gave me the following results:

```bash command
find /System/Library/AssetsV2 -name "*MobileAsset.*UAF*"
```
```bash output
/System/Library/AssetsV2/persisted/AutoAssetLocker/AutoAssetLocker_Entry_com.apple.MobileAsset.UAF.SummarizationKitConfiguration_com.apple.summarizationkit.ota.rules_1.0.6.13.202380_0.state
/System/Library/AssetsV2/persisted/AutoAssetLocker/AutoAssetLocker_Entry_com.apple.MobileAsset.UAF.SummarizationKitConfiguration_com.apple.summarizationkit.ota.configuration_1.1.14.13.202380_0.state
/System/Library/AssetsV2/persisted/AutoAssetDescriptors/AutoAssetDescriptors_Entry_com.apple.MobileAsset.UAF.SummarizationKitConfiguration_com.apple.summarizationkit.ota.rules_1.0.6.13.202380_0.state
/System/Library/AssetsV2/persisted/AutoAssetDescriptors/AutoAssetDescriptors_Entry_com.apple.MobileAsset.UAF.SummarizationKitConfiguration_com.apple.summarizationkit.ota.configuration_1.1.14.13.202380_0.state
/System/Library/AssetsV2/com_apple_MobileAsset_UAF_SummarizationKitConfiguration
/System/Library/AssetsV2/com_apple_MobileAsset_UAF_SummarizationKitConfiguration/purpose_auto/com_apple_MobileAsset_UAF_SummarizationKitConfiguration.xml
/System/Library/AssetsV2/com_apple_MobileAsset_UAF_SummarizationKitConfiguration/purpose_auto/3edcc9828b6f280a53f69b8b35ff9d664386ecb4.asset/AssetData/SummarizationOverrideRules.pbtxt
```

These filenames looked really interesting to me, specifically `com_apple_MobileAsset_UAF_SummarizationKitConfiguration.xml` and `SummarizationOverrideRules.pbtxt`. After looking at the contents of the XML file, it became clear that Apple uses a two-layer file structure for these files. The outer layer is AEA1 ([Apple Encrypted Archive](https://theapplewiki.com/wiki/Apple_Encrypted_Archive)) with decryption keys defined in the XML. Once the archive is decrypted, the inner files use either `skencv1` format (for SummarizationKit configuration) or plain AES-GCM (for FM Override deny lists). <-- TODO

The XML contains:

```xml
<dict>
    <key>ArchiveDecryptionKey</key>
    <string>WcCBfaFArWm9RYdRAtxGpmhLXzIjTkWbFHLdOkucv64=</string>
    <key>AssetSpecifier</key>
    <string>com.apple.summarizationkit.ota.configuration</string>
    <key>__BaseURL</key>
    <string>https://updates.cdn-apple.com/2024/Iris/mobileassets/023-67517/C5C95674-2976-43AB-9DA4-19EB7764867A/</string>
    <key>__RelativePath</key>
    <string>com_apple_MobileAsset_UAF_SummarizationKitConfiguration/196573C4-3A88-4E86-B004-7A87C4D947EC.aar</string>
</dict>
```

We can download and confirm the AEA1 magic bytes of the archive using:

```bash command
curl -sL "https://updates.cdn-apple.com/2024/Iris/mobileassets/023-67517/C5C95674-2976-43AB-9DA4-19EB7764867A/com_apple_MobileAsset_UAF_SummarizationKitConfiguration/196573C4-3A88-4E86-B004-7A87C4D947EC.aar" -o config.aar

xxd config.aar | head -1
```
```bash output
00000000: 4145 4131 ...  (AEA1 magic)
```

And then decrypt the archive using the key from the XML:

```bash command
echo "WcCBfaFArWm9RYdRAtxGpmhLXzIjTkWbFHLdOkucv64=" | base64 -d > key.bin
aea decrypt -i config.aar -o decrypted.aa -key key.bin -v
```
```bash output
profile: hkdf_sha256_aesctr_hmac__symmetric__none
raw data size: 34134 B
```

Now we can list the contents of the decrypted archive which show the pbtxt configuration files:

```bash command
aa list -i decrypted.aa -v
```
```bash output
F PAT=AssetData/ClassificationConfiguration.pbtxt
F PAT=AssetData/ClientSafetyConfiguration.pbtxt  
F PAT=AssetData/ClientSwitchConfiguration.pbtxt
F PAT=Info.plist
```

Looking at the header of these pbtxt files, we see the magic bytes for `skencv1`. This is an undocumented encryption scheme that Apple uses various things.

```
00000000: 736b 656e 6376 3198 c721 812d 3fe2 c025  skencv1..!.-?..%
00000010: 6ab5 a673 051f 3891 e9da 1b4b b342 39e4  j..s..8....K.B9.
00000020: 6461 fa94 03a3 3e08 4b4d c31f b1e1 0509  da....>.KM......
```

# Decrypting the configuration files

I couldn't find any documentation on the `skencv1` format, I tried some naive things like decrypting it with the same key as the AEA1 archive, but it didn't work. The `SummarizationKit.framework` binary isn't directly accessible as a standalone file, on modern macOS it lives inside a dyld shared cache which is a single monolithic binary containing many system frameworks. You can run `brew install blacktop/tap/ipsw` to install a tool that will extract it from `/System/Cryptexes/OS/System/Library/dyld/dyld_shared_cache_arm64e`.

```bash command
mkdir -p /tmp/dyld_extract
ipsw dyld extract \
/System/Cryptexes/OS/System/Library/dyld/dyld_shared_cache_arm64e \
SummarizationKit \
-o /tmp/dyld_cache
```
```bash output
    • Created /tmp/dyld_cache/SummarizationKit
```

I figured somewhere in the binary, there will be a reference to the `skencv1` string, so I grepped it:

```bash command
strings -t x SummarizationKit | grep skencv1
```
```bash output
1acc30 skencv1
```

I loaded `SummarizationKit` into Ghidra and searched for `73 6b 65 6e 63 76 31` (ASCII for `skencv1`) and found a reference at `0x29dfaf2b0`. After tracing the XREFS, I eventually found the function that was responsible for handling the `skencv1` format, `FUN_268cfdaf8`. The psuedocode for the function is as follows:

```c
undefined1[16] FUN_268cfdaf8(long param_1, ulong param_2)
{
    // 1. Lazy-initialize skencv1 constant (first time only)
    if (DAT_299467550 != -1) {
        _swift_once(&DAT_299467550, FUN_268cfdacc);
    }
    
    // 2. Load skencv1 string reference
    uVar2 = DAT_29946b5c0;
    uVar10 = DAT_29946b5b8;
    
    // 3. Extract first 7 bytes of input
    FUN_268d34fb8(0, 7, param_1, param_2);
    
    // 4. Compare to "skencv1"
    FUN_268cfeaac(uVar10, uVar2, uVar7, uVar9);
    
    // 5. If magic matches, proceed to decrypt
    if ((uVar10 & 1) != 0) {
        
        // === KEY INITIALIZATION ===
        if (DAT_299467558 != -1) {
            _swift_once(&DAT_299467558, FUN_268cfe2bc);  // <-- CRITICAL
        }
        
        // 6. Load key material
        uVar7 = DAT_29946ac00;   // <-- Key data
        uVar2 = DAT_29946abf8;   // <-- Key data
        
        // 7. Skip the 7-byte magic header
        FUN_268d34fb8(7, uVar10, param_1, param_2);
        
        // ... decryption continues ...
    }
}
```

I tried and failed several different ways of using Frida to hook various apple crypto functions to dump the key or the data being decrypted, but I had no luck. I also tried dumping the entire memory of the process after triggering the decryption in the hopes that the key or decrypted data would be floating around somewhere, but again no luck. With some help from Codex, I created an lldb debugging script that was ASLR-aware and would set a breakpoint on the `FUN_268cfdaf8` function. After triggering the decryption in Notes, I was able to hit the breakpoint and inspect the registers to find the key material being used for decryption.

The script can be found here:

At a high level, it does the following:

1. Calculates ASLR slide from SummarizationKit load address
2. Sets breakpoints on Ghidra-identified functions at runtime addresses
3. Captures register values (x0/x1) at entry and return
4. Dumps key-global memory snapshots before/after events
5. Decodes Swift-like buffer objects from x1 layouts
6. Auto-dumps input/output buffers to /tmp/sktrace-dumps

The commands to run the script are:

```bash command
launchctl kill SIGKILL gui/$(id -u)/com.apple.generativeexperiencesd 2>/dev/null || true
xcrun lldb -w -n generativeexperiencesd
```

Then while in lldb:

```bash command
command script import lldb_skencv1_trace.py
sktrace_init
c
```

Trigger text summarization from the Notes app, then watch the lldb console for the decryption to happen.



`gist:joshterrill/89d3f5bc8b235f5cbf31ce7610d78a73`

# FM Overrides

I some great research on the FM Override files done by [github.com/BlueFalconHD/apple_generative_model_safety_decrypted](https://github.com/BlueFalconHD/apple_generative_model_safety_decrypted)

Their process for finding the decryption key was roughly:

1. Use DTrace to identify which process reads .enc files
2. Found GenerativeExperiencesSafetyInferenceProvider calls ModelCatalog.Obfuscation.readObfuscatedContents
3. Set LLDB breakpoint on CryptoKit.AES.GCM.open(_:using:) at offset +36
4. Read the SymmetricKey from register using Xcode's Swift LLDB

Through their research, I was able to get this output from lldb:

```bash
🔑 dae8ad6ae7cee414a60525b107abbb3ec6d3f34d398d8c38317f67a3ddfc9989
```

Using this key, we can run their `decrypt_overrides.py` script to decrypt all of the FM Override files. What we discover is:

| Rule Type | Count | Description |
|-----------|-------|-------------|
| `reject` | 56 | Exact phrases that block the entire request |
| `remove` | 2 | Phrases silently removed from text |
| `replace` | 4 | Pattern → replacement mappings |
| `regexReject` | 1,219 | Regex patterns that block the request |
| `regexReplace` | 880 | Regex patterns with replacements |
| **Total** | **2,161** | All safety rules |

In an off-chance, I tried to use the same decryption key that was found via lldb to decrypt the pbtxt files, but they didn't work.

