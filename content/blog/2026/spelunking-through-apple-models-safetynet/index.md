---
title: Spelunking through Apple's safety models - SafetyNetLight
date: "2026-02-20T23:20:10.000Z"
description: On every Apple device are a group of offline classification models that classify images across a number of categories, including safety. While focusing on the SafetyNetLight model, we also discover SceneNetv5, which is a parent model that produces embeddings for scene classification (1,374 categories), entity recognition (7,287 categories), safety classification, object detection, saliency, aesthetics, and fingerprinting.
tags: ["reverse-engineering", "apple"]
published: true
---

# Finding the models

While doing some research [reverse engineering Apple's NeuralHash](https://github.com/joshterrill/python-neuralhash) model, I came across a treasure trove of other espresso models on Apple devices. You can find them by running `find /System/Library/ -name "*espresso*"`. After creating [espresso2onnx](https://github.com/joshterrill/espresso2onnx), a python script that I used in the NeuralHash project to convert espresso models to a more usable ONNX format, I tried to see what other models I could convert and analyze.

TODO: mention how these were done in a time when the shape and net files were just JSON files with a different extension, and how the new format is a bit more difficult to work with.

Apple already has a couple of public API's that use some of these models, looking through their documentation I found [`VNClassifyImageRequest`](https://developer.apple.com/documentation/vision/vnclassifyimagerequest), [`VNGenerateImageFeaturePrintRequest`](https://developer.apple.com/documentation/vision/vngenerateimagefeatureprintrequest) and [`SCSensitivityAnalyzer`](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) 

TODO

# Analysis of `CoreSceneUnderstanding.framework` networks

Searching the `/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/` directory, we find a number of espresso models and taxonomies:

```bash command
ls -laR /System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/
```
```bash output
CoreSceneUnderstanding.framework/Resources/
├── scenenet_v5_model/
|   ├── scenenet_sydro_model_default_config.json
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

Next I tried to run the same `espresso2onnx` script on the `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.net`, `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.weights`, and `SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.shape` but ran into unpacking errors in the net and shape files. This lead me to believe that something in the way that Apple packs these models may have changed since the version I used to build the NeuralHash library. In previous versions, these files were standard JSON files with a different extension, these files use some sort of proprietary format with a magic number of *pbze*:

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

I couldn't find any official Apple documentation on this, but `bvx2` appears to be a [magic number](https://en.wikipedia.org/wiki/List_of_file_signatures) for the LZFSE compression format. We can confirm this by crafting a `dd` command to skip the first 28 bytes (the header) and then pipe the rest of the file into `lzfse` for decompression:

```bash command
dd if=/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_custom_classifiers/SafetyNetLight/SafetyNetLight_v1.1.0/SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.net bs=1 skip=28 2>/dev/null | lzfse -decode -o safetynet.espresso.net.json
cat safetynet.espresso.net.json | head -n 40
```
```bash output
{
  "storage" : "SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.weights",
  "analyses" : {

  },
  "properties" : {
    "mldb_token" : "mldb-br4yn3dam9"
  },
  "format_version" : 200,
  "metadata_in_weights" : [

  ],
  "layers" : [
    {
      "pad_r" : 0,
      "fused_relu" : 1,
      "fused_tanh" : 0,
      "debug_info" : "input.8",
      "pad_fill_mode" : 0,
      "pad_b" : 0,
      "pad_l" : 0,
      "top" : "42",
      "K" : 768,
      "blob_biases" : 1,
      "quantization_lut_weights_blob" : 3,
      "name" : "input.8",
      "has_batch_norm" : 0,
      "type" : "convolution",
      "n_groups" : 1,
      "pad_t" : 0,
      "has_biases" : 1,
      "C" : 1024,
      "bottom" : "image_embed_normalize_out",
      "weights" : {

      },
      "Nx" : 1,
      "pad_mode" : 0,
      "pad_value" : 0,
      "Ny" : 1,
```

We discover here that input is a convolution layer with 1024 input channels and 768 output channels. This suggests that SafetyNetLight is not a standalone model, but rather a custom classifier that is built on top of the SceneNetv5 model, which produces the image embeddings that are fed into this model. The weights and quantization lookup tables are stored in the weights file and the shape file should contain the dimensions of these blobs, but it is also compressed with the same format. 

```bash command
dd if=/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_custom_classifiers/SafetyNetLight/SafetyNetLight_v1.1.0/SafetyNetLight_v1.1.0_vx6zphgfsp_15880_safetynet_quant.espresso.shape bs=1 skip=28 2>/dev/null | lzfse -decode -o safetynet.espresso.shape.json
cat safetynet.espresso.shape.json | head -n 20
```
```bash output
{
  "layer_shapes" : {
    "x.2" : {
      "k" : 1024,
      "w" : 1,
      "n" : 1,
      "_rank" : 4,
      "h" : 1
    },
    "42" : {
      "k" : 1024,
      "w" : 1,
      "n" : 1,
      "_rank" : 4,
      "h" : 1
    },
    "input.6" : {
      "k" : 1024,
      "w" : 1,
      "n" : 1,
```

The weights file is not in the same format as the net and shape file, we'll come back to it later after we analyze the net and shape files for SceneNetv5.

```bash command
dd if=/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_model/SceneNet_v5.13.0_8wiqmpbbig_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.2/SceneNet_v5.13.0_8wiqmpbbig_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.2.espresso.shape bs=1 skip=28 2>/dev/null | lzfse -decode -o scenenet.espresso.shape.json
dd if=/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_model/SceneNet_v5.13.0_8wiqmpbbig_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.2/SceneNet_v5.13.0_8wiqmpbbig_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.2.espresso.net bs=1 skip=28 2>/dev/null | lzfse -decode -o scenenet.espresso.net.json
```

SceneNetv5 has 11 output heads:

<table border="1" cellpadding="5" cellspacing="0">
  <tr align="left">
    <th>Output</th>
    <th>Shape</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>inner/sceneprint</td>
    <td>[1, 768, 1, 1]</td>
    <td><strong>Used by SafetyNetLight</strong></td>
  </tr>
  <tr>
    <td>classification/labels</td>
    <td>[1, 1374, 1, 1]</td>
    <td>Scene classification (1374 categories)</td>
  </tr>
  <tr>
    <td>entitynet/labels</td>
    <td>[1, 7287, 1, 1]</td>
    <td>Entity recognition (7287 categories)</td>
  </tr>
  <tr>
    <td>aesthetics/scores</td>
    <td>[1, 2, 1, 1]</td>
    <td>Aesthetic quality</td>
  </tr>
  <tr>
    <td>aesthetics/attributes</td>
    <td>[1, 21, 1, 1]</td>
    <td>Aesthetic attributes (21 dimensions)</td>
  </tr>
  <tr>
    <td>detection/scores</td>
    <td>[1, 30, 90, 90]</td>
    <td>Object detection</td>
  </tr>
  <tr>
    <td>detection/coordinates</td>
    <td>[1, 4, 90, 90]</td>
    <td>Bounding boxes</td>
  </tr>
  <tr>
    <td>fingerprint/embedding</td>
    <td>[1, 4, 6, 6]</td>
    <td>Image fingerprint (144-d)</td>
  </tr>
  <tr>
    <td>saliency/map</td>
    <td>[1, 1, 68, 68]</td>
    <td>Saliency map</td>
  </tr>
  <tr>
    <td>objectness/map</td>
    <td>[1, 1, 68, 68]</td>
    <td>Objectness map</td>
  </tr>
</table>

Looking at `scenenet_sydro_model_default_config.json` file we found from our previous `ls` command, we see how the full pipeline is put together.

```bash command
cat scenenet_sydro_model_default_config.json | jq
```
```bash output
{
  "data_input_key": "image",
  "model_relative_path": "models/scenenet_v5_model/SceneNet_v5.11.1_47tazbjgzq_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.1/SceneNet_v5.11.1_47tazbjgzq_fe1.3_sc3.3_sa2.4_ae2.4_so2.4_od1.5_fp1.5_en0.1.espresso.net",
  "model_input_shape": [
    0,
    3,
    360,
    360
  ],
  "model_input_range": [
    0,
    255
  ],
  "model_input_channel_order": "nchw",
  "model_input_key": "image",
  "model_outputs": [
    {
      "key": "classification/labels",
      "taxonomy": "taxonomies/applenet-scenenet-v5-20220719.json",
      "vocabulary": "leaf",
      "data_output_key": "scenenet_classification_labels"
    },
    {
      "key": "aesthetics/attributes",
      "taxonomy": "taxonomies/aesthetics-v8e.json",
      "vocabulary": "basic",
      "data_output_key": "scenenet_aesthetics_attributes"
    },
    {
      "key": "aesthetics/scores",
      "taxonomy": "taxonomies/aesthetics-v8e.json",
      "vocabulary": "global",
      "data_output_key": "scenenet_aesthetics_scores"
    },
    {
      "key": "saliency/map",
      "overlay_result_on_key": "image",
      "data_output_key": "scenenet_saliency_map"
    },
    {
      "key": "objectness/map",
      "overlay_result_on_key": "image",
      "data_output_key": "scenenet_objectness_map"
    },
    {
      "key": "inner/sceneprint",
      "data_output_key": "scenenet_sceneprint"
    },
    {
      "key": "detection/coordinates",
      "data_output_key": "scenenet_detection_coordinates"
    },
    {
      "key": "detection/scores",
      "data_output_key": "scenenet_detection_scores"
    },
    {
      "key": "entitynet/labels",
      "taxonomy": "taxonomies/EntityNet/entitynet_labels-v0a.json",
      "vocabulary": "basic",
      "data_output_key": "entitynet_classification_labels"
    }
  ]
}
```

The full pipeline looks something like this:

TODO: find a better transition for this

```
┌─────────────────────────────────────────────────────────────────┐
│   Image (360x360 RGB)                                           │
│     │                                                           │
│     ▼                                                           │
│   ┌──────────────────────────────────────────────────┐          │
│   │  SceneNet v5  (778 layers, 21 MB weights)        │          │
│   │  Input: raw pixels [1, 3, 360, 360]              │          │
│   │  Output: 768-d "sceneprint" embedding            │          │
│   └──────────────────┬───────────────────────────────┘          │
│                      │                                          │
│                      │  768 floating point numbers              │
│                      ▼                                          │
│   ┌──────────────────────────────────────────────────┐          │
│   │  SafetyNetLight  (15 layers, 1.9 MB weights)     │          │
│   │  Input: 768-d sceneprint [1, 768, 1, 1]          │          │
│   │  Output: 10 safety probabilities [1, 10, 1, 1]   │          │
│   └──────────────────┬───────────────────────────────┘          │
│                      │                                          │
│                      ▼                                          │
│   10 independent safety scores (each 0.0 to 1.0)                │
└─────────────────────────────────────────────────────────────────┘
```

# Parsing the weights

We observed in the net files the following fields related to the weights:

```json
"quantization_lut_weights_blob" : 3,
"quantization_ranges_blob" : 5,
```

This tells us that the weights are stored in quantized format, with lookup tables (LUT) for dequantization. According to [Apple's documentation on quantization](https://apple.github.io/coremltools/docs-guides/source/opt-quantization-overview.html), this is a way to reduce the model size and improve inference speed by using lower precision (e.g., 8-bit integers) instead of full precision (e.g., 32-bit floats). The LUTs are used to map the quantized values back to their original floating-point values during inference.

To parse the weights, we need to:

TODO:

# Converting to ONNX and running inference

Since my original `espresso2onnx` script was built for the older JSON format, I had to modify it to handle the new pbze compressed format. Once I added that functionality, I saw that there were a couple of new layer types that I haven't come across before. After adding code to handle these, I was finally able to run: `python3 espresso2onnx.py /tmp/safetynet_model/ -o safetynet_model.onnx`

Then I can do the same for the SceneNetv5 model: `python3 espresso2onnx.py /tmp/scenenet_model/ -o scenenet_model.onnx`

Then load them into an inference script:

```python
import onnxruntime as ort
from PIL import Image
import numpy as np

img = Image.open("photo.jpg").convert("RGB").resize((360, 360))
x = np.array(img, dtype=np.float32) / 127.5 - 1.0  # Scale to [-1, 1]
x = x.transpose(2, 0, 1)[np.newaxis, ...]  # [1, 3, 360, 360]

# backbone
backbone = ort.InferenceSession("scenenet_sceneprint.onnx")
sceneprint = backbone.run(None, {"image": x})[0]

# safety classifier
safety = ort.InferenceSession("safetynet_model.onnx")
scores = safety.run(None, {"image_embed_normalize_out": sceneprint})[0]

print(scores.flatten())
# Output: [0.01, 0.05, 0.02, 0.00, 0.03, 0.01, 0.00, 0.00, 0.00, 0.00]
```

# Converting the remaining classifier heads

There were 6 classifier heads found in the SceneNetv5 model, we can convert all of them to ONNX and run inference to see what they output on some sample images. This will give us a better understanding of what each head is doing and how they relate to each other. We can also compare the outputs of the different heads to see if there are any correlations or patterns that emerge.

TODO: fix this in template showing copy commands for the whole thing

```bash command
CSU="/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_custom_classifiers"

for head in JunkLeaf EventsLeaf JunkHierarchical CityNature SemanticDevelopment; do
    dir=$(ls -d "$CSU/$head"/*/ | head -1)
    mkdir -p /tmp/head && ln -sf "$dir"*.espresso.* /tmp/head/
    python3 espresso2onnx.py /tmp/head -o ${head}.onnx
    rm -rf /tmp/head
done
```

TODO: finish