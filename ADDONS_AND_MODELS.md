# 📦 STRANGELET LAB: ADD-ONS & MODEL DOWNLOAD CENTER

Welcome to the **Strangelet Lab Add-on & Model Hub**.  
Strangelet Lab is built to be **100% air-gapped and offline-first**. You can run the app without any AI models at all, or connect it to your favorite local models on your GPU.

---

## 👻 1. GHOST LLM BRAINS (AI STUDIO SENSEI)

GHOST is your in-studio audio mentor, analog sage, and Faust DSP architect.  
Choose the model that best matches your GPU VRAM:

| Model | Recommended Hardware | VRAM Usage | File Size | 1-Line Ollama Command | Hugging Face GGUF Link |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google Gemma 2 2B IT** *(Ultralight)* | Any 4GB GPU / Integrated Graphics | **1.6 GB** | 1.6 GB | `ollama run gemma2:2b` | [Gemma-2-2B-IT-GGUF](https://huggingface.co/google/gemma-2-2b-it-GGUF) |
| **Qwen 2.5 3B Instruct** | GTX 1650, RTX 3050, 4GB–6GB Laptops | **2.1 GB** | 1.9 GB | `ollama run qwen2.5:3b` | [Qwen2.5-3B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF) |
| **Qwen 2.5 7B Instruct** *(Recommended)* | RTX 3060, RTX 4060, Apple M 16GB | **4.2 GB** | 4.7 GB | `ollama run qwen2.5:7b` | [Qwen2.5-7B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF) |
| **Google Gemma 2 9B IT** *(Precision)* | RTX 3060 12GB / RTX 4060 / Mac 16GB | **5.8 GB** | 5.4 GB | `ollama run gemma2:9b` | [Gemma-2-9B-IT-GGUF](https://huggingface.co/google/gemma-2-9b-it-GGUF) |
| **Meta Llama 3.1 8B** *(Analog Sage)* | RTX 3070, RTX 4070 8GB | **4.8 GB** | 4.9 GB | `ollama run llama3.1:8b` | [Llama-3.1-8B-Instruct-GGUF](https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF) |
| **Qwen 2.5 14B Pro** | RTX 4070 Ti, RTX 4080 16GB, Mac 32GB | **8.8 GB** | 9.2 GB | `ollama run qwen2.5:14b` | [Qwen2.5-14B-Instruct-GGUF](https://huggingface.co/Qwen/Qwen2.5-14B-Instruct-GGUF) |

### How to Run GHOST Locally:
1. **Via Ollama (Easiest)**:
   * Install [Ollama](https://ollama.com).
   * Open Terminal and run: `ollama run qwen2.5:7b`
   * In Strangelet Lab, open **AI / Tools &rarr; Local AI Hub Settings** and select **Ollama (`http://localhost:11434`)**.
2. **Via Kobold.cpp (Ultra-Low VRAM)**:
   * Download the standalone [Kobold.cpp](https://koboldai.org/cpp) executable.
   * Launch it, load your downloaded `.gguf` file, and set port to `5001`.
   * In Strangelet Lab, select **Kobold.cpp (`http://localhost:5001`)**.
3. **Zero-Setup Offline Fallback**:
   * If no local server is running, Strangelet Lab's built-in **Software Dojo Heuristic Kernel** automatically powers Ghost with zero hallucination.

---

## ⚡ 2. ACE-STEP 1.5 NEURAL AUDIO DIFFUSION

Ace-Step 1.5 generates bar-synced, tempo-locked audio loops (drums, acid 303 bass, pads, leads) directly into timeline tracks.

| Component | Model Name | Format | VRAM | Download Link |
| :--- | :--- | :--- | :--- | :--- |
| **Language Backbone** | `acestep-5Hz-lm-1.7B-BF16.gguf` | GGUF | 2.4 GB | [AceStep 1.5 GGUF on HuggingFace](https://huggingface.co/Comfy-Org/AceStep_1.5_GGUF) |
| **Diffusion DiT** | `acestep-v15-turbo-shift3-BF16.safetensors` | Safetensors | 3.2 GB | [AceStep 1.5 Weights on HuggingFace](https://huggingface.co/Comfy-Org/AceStep_1.5_GGUF) |
| **ComfyUI Node** | `ComfyUI-AceStep` | Python Extension | 0 MB | [ComfyUI-AceStep GitHub](https://github.com/Comfy-Org/ComfyUI-AceStep) |

### How to Connect to Strangelet Lab:
1. Start your local ComfyUI instance on `http://127.0.0.1:8188`.
2. In Strangelet Lab, open the **Ace-Step 1.5 Designer** (`Sparkles` icon).
3. Toggle **"Connect Local ComfyUI"** to **ON**.
4. Generate: Your prompt and BPM are sent to the local diffusion model, and the resulting `.wav` stem automatically lands on your timeline!

---

## 🎶 3. YuE2 FULL-SONG GENERATOR

YuE2 is a 7B dual-track foundation model for generating complete full-length songs with separated vocal and backing tracks.

| Model | Description | Size | Download Link |
| :--- | :--- | :--- | :--- |
| **YuE-s1-7B-anneal-en-cot** | Stage 1 Lyric-to-Acoustic Tokens Model | 8.4 GB | [YuE-s1 on HuggingFace](https://huggingface.co/multimodalart/YuE-GPT) |
| **YuE-s2-1B-general** | Stage 2 Dual-Track Vocal/Instrumental Model | 2.2 GB | [YuE-s2 on HuggingFace](https://huggingface.co/multimodalart/YuE-GPT) |
| **xCodec Neural Vocoder** | 48kHz Stereo Waveform Decoder | 1.1 GB | [xCodec on HuggingFace](https://huggingface.co/HKUST-Audio/xcodec_mini_infer) |

---

## 🎹 4. FREE SOUNDFONT & SFZ INSTRUMENT PACKS

High-quality sample-based instruments for the built-in **SFZ Player** and **Drum Transient Replacer** (100% Web Audio, zero GPU needed):

1. **Concert Grand Piano SFZ**: 4 velocity layers, real hammer release, uncompressed stereo.
2. **1973 Rhodes Mark I Vintage EP**: Sampled through tube preamps with natural bell harmonics.
3. **Roland TR-808 & TR-909 Analog Master Drum Kit**: Studio-grade drum transient hits for 1-click drum replacement.
4. **Mellotron M400 Vintage Strings**: Authentic tape-loop flute, violin, and choir samples.

*Included inside the Strangelet Lab local sound library or downloadable via [GitHub Releases](https://github.com/lordgriefo/Strangelet-Lab/releases).*

---

## 🛠️ VRAM TIER QUICK-REFERENCE

| Your GPU VRAM | Recommended Ghost LLM | Stem Separation | Ace-Step Diffusion |
| :--- | :--- | :--- | :--- |
| **4GB - 6GB** | Qwen 2.5 3B (2.1GB) | Mobile ONNX (On-Demand) | Sequential Generation |
| **8GB** | Qwen 2.5 7B or Llama 8B (4.5GB) | HTDemucs 4-Stem | Standby Mode |
| **16GB+** | Qwen 2.5 14B Pro (8.8GB) | Full FP16 Resident | Full Multi-Track Concurrent |
