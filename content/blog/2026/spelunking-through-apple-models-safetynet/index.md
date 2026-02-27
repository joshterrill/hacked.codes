---
title: Spelunking through Apple's safety models - SafetyNetLight
date: "2026-02-20T23:20:10.000Z"
description: On every Apple device are a group of offline classification models that classify images across a number of categories, including safety. While focusing on the SafetyNetLight model, we also discover SceneNetv5, which is a parent model that produces embeddings for scene classification (1,374 categories), entity recognition (7,287 categories), safety classification, object detection, saliency, aesthetics, and fingerprinting.
tags: ["reverse-engineering", "apple"]
published: true
---

# Finding the models

While doing some research [reverse engineering Apple's NeuralHash](https://github.com/joshterrill/python-neuralhash) model, I came across a treasure trove of other espresso models on Apple devices. You can find them by running `find /System/Library/ -name "*espresso*"`. After creating [espresso2onnx](https://github.com/joshterrill/espresso2onnx), a python script that I used in the NeuralHash project to convert espresso models to a more usable ONNX format, I tried to see what other models I could convert and analyze.

In my [previous work on NeuralHash](https://github.com/joshterrill/python-neuralhash), the `.espresso.net` and `.espresso.shape` files were plain JSON and could be called with `json.load()`. Those older models (NeuralHash, pet classifier, sound classifier, various CoreNLP models) all used this straightforward format. But these newer models in `CoreSceneUnderstanding.framework` use a different format entirely - a custom `pbze` header followed by an LZFSE compressed payload.

Apple already has a couple of public API's that use some of these models, looking through their documentation I found [`VNClassifyImageRequest`](https://developer.apple.com/documentation/vision/vnclassifyimagerequest), [`VNGenerateImageFeaturePrintRequest`](https://developer.apple.com/documentation/vision/vngenerateimagefeatureprintrequest) and [`SCSensitivityAnalyzer`](https://developer.apple.com/documentation/sensitivecontentanalysis/scsensitivityanalyzer) 

`VNGenerateImageFeaturePrintRequest` is particularly interesting because it gives us access to the same 768-dimensional "sceneprint" embedding that SafetyNetLight consumes. By extracting the sceneprint via the public Vision API and comparing it against our ONNX model's output, we can verify that our converted model is producing correct results. Similarly, `VNClassifyImageRequest` uses the same SceneNet backbone internally for its 1,374 scene categories, giving us another verification point.

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
```
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

Drawing it out as a diagram, we have:

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

We observed in the net files the following fields related to the weights across multiple layers, here's an example from the first convolution layer:

```json
"quantization_lut_weights_blob" : 3,
"quantization_ranges_blob" : 5,
```

This tells us that the weights are stored in quantized format, with lookup tables (LUT) for dequantization. According to [Apple's documentation on quantization](https://apple.github.io/coremltools/docs-guides/source/opt-quantization-overview.html), this is a way to reduce the model size and improve inference speed by using lower precision (e.g., 8-bit integers) instead of full precision (e.g., 32-bit floats). The LUTs are used to map the quantized values back to their original floating-point values during inference, therefore:

1. **Weights blob (id=3):** Contains uint8 indices (1 byte per weight)
2. **Ranges blob (id=5):** Contains float32 range values for dequantization

I didn't know how to convert the uint8 indices back to float32 weights, so I had to do some experimentation to figure out the correct dequantization formula. I found some documentation on specific [Apple algorithms](https://apple.github.io/coremltools/docs-guides/source/opt-quantization-algos.html) but didn't find any specific information on how the LUT quantization works, so I had to reverse engineer it myself. I tried a few different formulas based on common quantization schemes, but only one of them produced results that made sense given the values in the ranges blob. With some Codex help, I found the correct one which ended up matching [TensorFlowLite's quantization](https://ai.google.dev/edge/litert/conversion/tensorflow/quantization/quantization_spec).

To verify, I looked at the final classifier layer (512 -> 10), which had only 20 range values for 10 output channels:

```python
fc_ranges = np.frombuffer(blobs[33], dtype=np.float32)  # 20 values
fc_mins = fc_ranges[:10]  # First half
fc_maxs = fc_ranges[10:]  # Second half

# Output showed clearly symmetric pairs:
# Channel 0: min=-0.150, max=+0.149
# Channel 1: min=-0.269, max=+0.267
# Channel 4: min=-1.276, max=+1.266
```

This confirmed the split layout. The final dequantization formula is:

```python
def dequantize_lut_weights(indices_blob, ranges_blob, out_channels, in_channels, kh=1, kw=1):
    """
    Apple's LUT quantization format:
      - indices_blob: uint8 array (1 byte per weight, values 0-255)
      - ranges_blob: float32 array, split as [all_mins | all_maxes]
      
    Dequantization: weight = min + (index / 255) * (max - min)
    """
    num_weights = out_channels * in_channels * kh * kw
    indices = np.frombuffer(indices_blob[:num_weights], dtype=np.uint8)
    ranges = np.frombuffer(ranges_blob, dtype=np.float32)
    
    # Split layout
    mins = ranges[:out_channels]
    maxs = ranges[out_channels:]
    
    # Reshape and dequantize
    indices_2d = indices.reshape(out_channels, in_channels * kh * kw).astype(np.float32)
    scales = (maxs - mins) / 255.0
    weights = mins[:, None] + indices_2d * scales[:, None]
    
    return weights.reshape(out_channels, in_channels, kh, kw)
```

# Converting to ONNX and running inference

Since my original `espresso2onnx` script was built for the older JSON format for the net and shape files, I had to modify it to handle the new pbze compressed format, then there were a handful of new layer types that also needed to be implemented. I was finally able to extract the ONNX model by running: `python3 espresso2onnx.py /tmp/safetynet_model/ -o safetynet_model.onnx`

Then I can do the same for the SceneNetv5 model: `python3 espresso2onnx.py /tmp/scenenet_model/ -o scenenet_model.onnx`

And load them into an inference script:

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

Here are the classifier heads I found in `scenenet_v5_custom_classifiers/`:

<table>
<thead align="left"><tr>
<th>Head</th>
<th>Output Size</th>
<th>Purpose</th>
</tr></thead>
<tbody>
<tr>
<td>SafetyNetLight</td>
<td>10</td>
<td>Safety categories</td>
</tr>
<tr>
<td>EventsLeaf</td>
<td>62</td>
<td>Event types</td>
</tr>
<tr>
<td>JunkLeaf</td>
<td>12</td>
<td>Junk detection (i.e. blurry photo, screenshot, etc.)</td>
</tr>
<tr>
<td>JunkHierarchical</td>
<td>5</td>
<td>Junk hierarchy</td>
</tr>
<tr>
<td>CityNature</td>
<td>3</td>
<td>City vs nature</td>
</tr>
<tr>
<td>SemanticDevelopment</td>
<td>2</td>
<td>Food vs landscape</td>
</tr>
</tbody>
</table>

To convert them all:

```bash command
CSU="/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework/Versions/A/Resources/scenenet_v5_custom_classifiers"

for head in JunkLeaf EventsLeaf JunkHierarchical CityNature SemanticDevelopment; do
    dir=$(ls -d "$CSU/$head"/*/ | head -1)
    mkdir -p /tmp/head && ln -sf "$dir"*.espresso.* /tmp/head/
    python3 espresso2onnx.py /tmp/head -o ${head}.onnx
    rm -rf /tmp/head
done
```

All 5 converted successfully. Each being a small model that takes the 768-d sceneprint as input.

# Complete inference script

Here's a full Python script that runs the backbone and all classifier heads:

```python
import argparse
import os
import sys
import subprocess
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCENENET_MODEL = os.path.join(SCRIPT_DIR, "scenenet_classifier.onnx")
SAFETY_MODEL = os.path.join(SCRIPT_DIR, "safetynet_model.onnx")

SAFETY_CATEGORIES = [
    "unsafe", "sexual", "violence", "gore", "weapon_violence",
    "weapon_any", "drugs", "medically_sensitive", "riot_looting",
    "terrorist_hate_groups"
]

TAXONOMY_BASE = (
    "/System/Library/PrivateFrameworks/CoreSceneUnderstanding.framework"
    "/Versions/A/Resources/taxonomies"
)


def load_bplist(path):
    if not os.path.exists(path):
        return None
    try:
        import plistlib
        result = subprocess.run(
            ["plutil", "-convert", "xml1", "-o", "-", path],
            capture_output=True, check=True)
        return plistlib.loads(result.stdout)
    except Exception:
        return None


def load_taxonomy_labels():
    labels = {
        "scene_vocab": None,
        "entity_vocab": None,
        "human_readable": None,
    }
    en_base = f"{TAXONOMY_BASE}/EntityNet/v0b"
    labels["human_readable"] = load_bplist(f"{en_base}/ENv0b_attribute__humanReadableLabel.bplist")
    labels["scene_vocab"] = load_bplist(f"{en_base}/ENv0b_vocabulary00__scenenet_leaf.bplist")
    labels["entity_vocab"] = load_bplist(f"{en_base}/ENv0b_vocabulary02__entitynet.bplist")
    return labels


def get_label(labels, vocab_key, index):
    vocab = labels.get(vocab_key)
    hr = labels.get("human_readable")
    if vocab and index < len(vocab):
        ident = vocab[index]
        if hr and ident in hr:
            return hr[ident]
        if ident:
            return ident
    return f"[{index}]"


def preprocess_image(image_path):
    from PIL import Image
    img = Image.open(image_path).convert("RGB").resize((360, 360))
    x = np.array(img, dtype=np.float32) / 127.5 - 1.0
    x = x.transpose(2, 0, 1)[np.newaxis, ...]
    return x


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to input image")
    parser.add_argument("--only-human", action="store_true", help="Skip entities without human-readable labels")
    args = parser.parse_args()

    image_path = args.image

    if not os.path.exists(image_path):
        print(f"Error: Image not found: {image_path}")
        sys.exit(1)
    if not os.path.exists(SCENENET_MODEL):
        print(f"Error: Model not found: {SCENENET_MODEL}")
        sys.exit(1)
    if not os.path.exists(SAFETY_MODEL):
        print(f"Error: Safety model not found: {SAFETY_MODEL}")
        sys.exit(1)

    import onnxruntime as ort

    print(f"Loading SceneNet v5 model...")
    sess = ort.InferenceSession(SCENENET_MODEL)

    labels = load_taxonomy_labels()
    has_labels = labels["human_readable"] is not None

    x = preprocess_image(image_path)
    print(f"Image: {image_path}")

    print("Running inference...")
    outputs = sess.run(None, {"image": x})
    output_map = {sess.get_outputs()[i].name: outputs[i] for i in range(len(outputs))}

    top_n = 25

    if "classification/labels" in output_map:
        scores = output_map["classification/labels"].flatten()
        top_idx = np.argsort(scores)[::-1][:top_n]
        print(f"\n{'═' * 55}")
        print(f"SCENE CLASSIFICATION (top {top_n} of {len(scores)})")
        print(f"{'═' * 55}")
        for idx in top_idx:
            label = get_label(labels, "scene_vocab", idx) if has_labels else f"[{idx}]"
            bar = "█" * max(1, int(scores[idx] * 40))
            print(f"  {scores[idx]:7.4f}  {bar}  {label}")

    if "entitynet/labels" in output_map:
        scores = output_map["entitynet/labels"].flatten()
        print(f"\n{'═' * 55}")
        print(f"ENTITY RECOGNITION (top {top_n} of {len(scores)})")
        print(f"{'═' * 55}")
        count = 0
        for idx in np.argsort(scores)[::-1]:
            label = get_label(labels, "entity_vocab", idx) if has_labels else f"[{idx}]"
            if args.only_human and label.startswith("["):
                continue
            bar = "█" * max(1, int(scores[idx] * 40))
            print(f"  {scores[idx]:7.4f}  {bar}  {label}")
            count += 1
            if count >= top_n:
                break

    if "inner/sceneprint" in output_map:
        sp = output_map["inner/sceneprint"]
        sp_flat = sp.flatten()
        print(f"\n{'═' * 55}")
        print(f"SCENEPRINT: 768-d, range=[{sp_flat.min():.4f}, {sp_flat.max():.4f}]")

        safety_sess = ort.InferenceSession(SAFETY_MODEL)
        safety_out = safety_sess.run(None, {"image_embed_normalize_out": sp.reshape(1, 768, 1, 1)})

        for i, o in enumerate(safety_sess.get_outputs()):
            if "post_act" in o.name:
                probs = safety_out[i].flatten()
                print(f"\n{'═' * 55}")
                print(f"SAFETY CLASSIFICATION")
                print(f"{'═' * 55}")
                for cat, prob in zip(SAFETY_CATEGORIES, probs):
                    print(f"  {prob:7.4f}  {cat}")
                break


if __name__ == "__main__":
    main()
```

I added an optional `--only-human` flag to filter out entity recognition results that don't have human-readable labels, since there are thousands of them and many are not very interpretable.

And I can run it like this:

```bash command
python run_scenenet_classifier.py /tmp/sf-chinatown.jpeg --only-human
```
```bash output
Loading SceneNet v5 model...
Image: /tmp/sf-chinatown.jpeg
Running inference...

═══════════════════════════════════════════════════════
SCENE CLASSIFICATION (top 25 of 1374)
═══════════════════════════════════════════════════════
   0.0300  █  Raw Metal
   0.0209  █  Circuit Board
   0.0180  █  Screenshot
   0.0083  █  Textile
   0.0077  █  Puzzles
   0.0065  █  Gears
   0.0060  █  Adult
   0.0052  █  Raw Glass
   0.0047  █  Foliage
   0.0045  █  [904]
   0.0042  █  Fence
   0.0040  █  Spiderweb
   0.0038  █  Wood Processed
   0.0037  █  Polka Dots
   0.0037  █  Jigsaw
   0.0035  █  Map
   0.0033  █  Cactus
   0.0027  █  Diagram
   0.0023  █  [1168]
   0.0023  █  Handwriting
   0.0022  █  Branch
   0.0018  █  Window
   0.0018  █  Spider
   0.0018  █  Illustrations
   0.0017  █  [1355]

═══════════════════════════════════════════════════════
ENTITY RECOGNITION (top 25 of 7287)
═══════════════════════════════════════════════════════
   0.7122  ████████████████████████████  Pattern
   0.7117  ████████████████████████████  Green
   0.6554  ██████████████████████████  Turquoise
   0.6193  ████████████████████████  Red
   0.6068  ████████████████████████  Pink
   0.5983  ███████████████████████  Yellow
   0.5917  ███████████████████████  Text
   0.5350  █████████████████████  Font
   0.5038  ████████████████████  Purple
   0.4920  ███████████████████  Fractal Art
   0.4595  ██████████████████  Violet
   0.4479  █████████████████  Monochrome
   0.4137  ████████████████  Line
   0.4115  ████████████████  Drawing
   0.4043  ████████████████  Close-Up
   0.4014  ████████████████  Lighting
   0.3920  ███████████████  Reef
   0.3885  ███████████████  Lavender
   0.3857  ███████████████  Black and White
   0.3758  ███████████████  Tartan
   0.3748  ██████████████  Symmetry
   0.3746  ██████████████  Hair
   0.3741  ██████████████  Spine
   0.3740  ██████████████  Face
   0.3667  ██████████████  Cartoon

═══════════════════════════════════════════════════════
SCENEPRINT: 768-d, range=[-0.8027, 0.3495]

═══════════════════════════════════════════════════════
SAFETY CLASSIFICATION
═══════════════════════════════════════════════════════
   0.0037  unsafe
   0.0001  sexual
   0.0001  violence
   0.0002  gore
   0.0000  weapon_violence
   0.0016  weapon_any
   0.0011  drugs
   0.0000  medically_sensitive
   0.0000  riot_looting
   0.0000  terrorist_hate_groups
```

The next blog post will be a deep dive into Apple's SummarizationKit models, which are also found in `CoreSceneUnderstanding.framework`.