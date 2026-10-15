# IHRM Air — AetherMesh local AI and training kit

This folder adds an optional local-model path to the IHRM Air GitHub Pages study hub.

## What is connected

- The floating **AI Study Crew** keeps the seven repository-derived specialist roles.
- The new **AetherMesh · Local Inference** panel calls an Ollama server running on your own computer.
- The selected specialist's role instructions and relevant IHRM note blocks are sent to the local model.
- **Run AetherMesh local team** asks one local model to follow a staged synthesis → teaching → quiz → reality-check workflow. It is explicitly a single-model workflow, not seven independent model calls.
- `training/ihrm_sft.jsonl` contains a small reviewed starter dataset.
- `training/train_lora.py` performs actual LoRA supervised fine-tuning of a local Hugging Face model. This is separate from the Ollama Modelfile, which customizes instructions but does not train weights.

## 1. Install and start a local model

Install Ollama from its official website: https://ollama.com

Then run:

```bash
ollama pull qwen2.5:3b
ollama serve
```

If Ollama already starts automatically, do not start a second server. Check that this responds locally:

```bash
curl http://localhost:11434/api/tags
```

Open IHRM Air, open the floating **AI Study Crew**, keep the endpoint as `http://localhost:11434`, set model to `qwen2.5:3b`, and press **Test / find models**.

### Browser-origin/CORS setup

The website is served from GitHub Pages, while Ollama runs on your computer. If the browser reports a network/CORS error, allow only the site origin in Ollama's environment before restarting Ollama:

```text
OLLAMA_ORIGINS=https://mutayibnissar.github.io
```

- **macOS/Linux terminal session:** stop Ollama, run `OLLAMA_ORIGINS=https://mutayibnissar.github.io ollama serve`, then reload the page.
- **Windows PowerShell session:** stop Ollama, run `$env:OLLAMA_ORIGINS="https://mutayibnissar.github.io"` and then `ollama serve`.
- For a permanent setup, set that environment variable in the way your OS/service manager launches Ollama, then restart the service.

Only allow the exact site origin you trust. Do not expose port 11434 to the public internet. The local browser connection is not available when your computer is off or when Ollama is not running.

## 2. Create a custom Ollama model (prompt customization, not weight training)

From this folder:

```bash
ollama create ihrm-air:local -f Modelfile
```

Then set the website's model field to `ihrm-air:local`. The Modelfile sets a system instruction and generation parameters; it does **not** update model weights.

## 3. Actual local fine-tuning (LoRA)

A GPU with sufficient VRAM is strongly recommended. The starter script uses a 4-bit base model when CUDA is available; CPU-only fine-tuning can be extremely slow and is not the recommended route.

```bash
python -m venv .venv
# macOS/Linux
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r training/requirements.txt
python training/train_lora.py
```

Defaults to `Qwen/Qwen2.5-3B-Instruct`, trains on `training/ihrm_sft.jsonl`, and writes a LoRA adapter under `training/output/final-adapter`. To change the base model, set `BASE_MODEL` before running the script. Ensure any adapter is used with the exact same base-model family/version.

The starter dataset is intentionally small: it demonstrates the pipeline, not a production-quality tutor. Expand it with reviewed examples from your actual syllabus, unit notes, exam questions, answer rubrics, and verified explanations. Remove personal data and copyrighted textbook passages you do not have rights to use. Validate on held-out questions before using a fine-tuned model for exams.

## Privacy and safety

- The local model path does not require a Gemini or OpenAI API key.
- Inference prompts are sent to the endpoint you enter. By default, that is your own computer.
- Do not enter secrets or personal data into model prompts.
- The website itself cannot install Ollama or train model weights; installation and training run on your computer.

## 4. Load the trained LoRA adapter into Ollama

After training completes, check that `local-ai/training/output/final-adapter/adapter_config.json` exists. From the repository root, create a model using the matching Qwen2.5 3B Instruct base:

```bash
ollama create ihrm-air-finetuned:local -f local-ai/Modelfile.finetuned
```

The fine-tuned Modelfile points at the adapter directory. The adapter and Ollama base model must match. If Ollama reports an adapter-format or base-model mismatch, do not force it; use a compatible export/conversion path for your exact model version and verify the model before using it. Then set the website model field to `ihrm-air-finetuned:local`.

The fine-tuned model is only as reliable as the reviewed training examples. Keep a held-out evaluation set and compare it with the untuned model before relying on it.
