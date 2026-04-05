---
title: Spelunking through Apple's safety models - ClientSafetyConfiguration and SummarizationKit
date: "2026-04-05T01:02:45.000Z"
description: We take a deep dive into the Apple SummarizationKit models which apply safety classification and summarization to text across several Apple products such as Notes, Mail, Messages, and Safari. This model has a number of safety classification features that we will reverse engineer and analyze.
tags: ["reverse-engineering", "apple"]
published: false
---

# The structure of SummarizationKit

Apple uses a two-layer scheme for their SummarizationKit models. The outer layer is AEA1 (Apple Encrypted Archive) with keys in public asset catalog XML. The inner layer uses either `skencv1` format (for SummarizationKit configuration) or plain AES-GCM (for FM Override deny lists).

We found the CDN link to the outer AE1 archive in the public asset XML catalog. We can download the AE1 archive and decrypt it using the key from the XML and check the magic bytes to confirm it's an AE1 archive.

The XML contains entries like:
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



```bash command
curl -sL "https://updates.cdn-apple.com/2024/Iris/mobileassets/023-67517/C5C95674-2976-43AB-9DA4-19EB7764867A/com_apple_MobileAsset_UAF_SummarizationKitConfiguration/196573C4-3A88-4E86-B004-7A87C4D947EC.aar" -o config.aar

xxd config.aar | head -1
```
```bash output
00000000: 4145 4131 ...  (AEA1 magic)
```

Now we can use the key to decrypt the archive:

```bash command
echo "WcCBfaFArWm9RYdRAtxGpmhLXzIjTkWbFHLdOkucv64=" | base64 -d > key.bin
aea decrypt -i config.aar -o decrypted.aa -key key.bin -v
```
```bash output
profile: hkdf_sha256_aesctr_hmac__symmetric__none
raw data size: 34134 B
```

We can examine the decrypted archive using

```bash command
aa list -i decrypted.aa -v
```
```bash output
F PAT=AssetData/ClassificationConfiguration.pbtxt
F PAT=AssetData/ClientSafetyConfiguration.pbtxt  
F PAT=AssetData/ClientSwitchConfiguration.pbtxt
F PAT=Info.plist
```

Looking at the header of these pbtxt files, we see the magic bytes for `skencv1`. This is an undocumented encryption scheme that Apple uses for some of their models.

```
00000000: 736b 656e 6376 3198 c721 812d 3fe2 c025  skencv1..!.-?..%
00000010: 6ab5 a673 051f 3891 e9da 1b4b b342 39e4  j..s..8....K.B9.
00000020: 6461 fa94 03a3 3e08 4b4d c31f b1e1 0509  da....>.KM......
```

