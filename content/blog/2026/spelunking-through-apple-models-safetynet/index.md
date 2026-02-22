---
title: Spelunking through Apple models - SafetyNetLight
date: "2026-02-20T23:20:10.000Z"
description: On every Apple device are a group of offline classification models that classify images and text across a number of categories, including safety. While focusing on the SafetyNetLight model, we also discover SceneNetv5, which is a parent model that produces embeddings for scene classification (1,374 categories), entity recognition (7,287 categories), safety classification, object detection, saliency, aesthetics, and fingerprinting.
tags: ["reverse-engineering", "apple"]
published: true
---

# Finding the models

While doing some research [reverse engineering Apple's NeuralHash](https://github.com/joshterrill/python-neuralhash) model, I came across a treasure trove of other espresso models on Apple devices. You can find them by running `find /System/Library/ -name "*espresso*"`. After creating [espresso2onnx](https://github.com/joshterrill/espresso2onnx), a python script that I used in the NeuralHash project to convert espresso models to a more usable ONNX format, I tried to see what other models I could convert and analyze.

Apple already has a couple of public API's that use some of these models, looking through their documentation I found [`VNClassifyImageRequest`](https://developer.apple.com/documentation/vision/vnclassifyimagerequest), [`VNGenerateImageFeaturePrintRequest`](https://developer.apple.com/documentation/vision/vngenerateimagefeatureprintrequest) and [`SCSensitivityAnalyzer`](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) 

TODO

# Analysis of `CoreSceneUnderstanding.framework`

Searching the `/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/` directory, we find a number of espresso models and taxonomies:

```bash command
ls -laR /System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/
```
```bash output
CoreSceneUnderstanding.framework/Resources/
├── scenenet_v5_model/
│   └── SceneNet_v5.13.0_8wiqmpbbig_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.2/
│       ├── *.espresso.net
│       ├── *.espresso.shape
│       └── *.espresso.weights
├── scenenet_v5_custom_classifiers/
│   ├── SafetyNetLight/
│   │   └── SafetyNetLight_v1.1.0/
│   │       ├── *.espresso.net
│   │       ├── *.espresso.shape
│   │       └── *.espresso.weights
│   ├── EventsLeaf/
│   ├── JunkLeaf/
│   ├── JunkHierarchical/
│   ├── CityNature/
│   └── SemanticDevelopment/
└── taxonomies/
    ├── SafetyNetLight/
    │   └── SafetyNetLight-v1a_vocabulary00__leaf.bplist
    └── EntityNet/
        └── ... (label mappings)
```

We discover a taxonomy list stored as a binary plist (bplist) file for the SafetyNetLight model revealing the following categories:

```bash command
plutil -p /System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/taxonomies/SafetyNetLight/SafetyNetLight-v1a_vocabulary00__leaf.bplist
```
```bash output
[
  0 => "unsafe"
  1 => "sexual"
  2 => "violence"
  3 => "gore"
  4 => "weapon_violence"
  5 => "weapon_any"
  6 => "drugs"
  7 => "medically_sensitive"
  8 => "riot_looting"
  9 => "terrorist_hate_groups"
]
```

We can assume that these are most likely the categories that are used for the probability distribution in the model.

Next I tried to run the same `espresso2onnx` script on the `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.net`, `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.weights`, and `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.shape` but ran into unpacking errors the net and shape files. This lead me to believe that something in the way that Apple packs these models may have changed since the days of NeuralHash. Where with NeuralHash, these files were standard JSON files with a different extension, these files use some sort of proprietary format with a magic-number of *pbze*:

```bash command
xxd /System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_custom_classifiers/SafetyNetLight/SafetyNetLight_v1.1.0/SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.net | head -n 5
````
```bash output
00000000: 7062 7a65 0000 0000 4000 0000 0000 0000  pbze....@.......
00000010: 0000 1c0b 0000 0000 0000 0524 6276 7832  ...........$bvx2
00000020: 0b1c 0000 4402 c017 0046 0140 f51b 2082  ....D....F.@.. .
00000030: 07e7 0210 bd00 0000 3f1c 9002 cfc0 ec88  ........?.......
00000040: aaaa 8a22 30a6 e9d8 2319 635e 2c12 40c9  ..."0...#.c^,.@.
```