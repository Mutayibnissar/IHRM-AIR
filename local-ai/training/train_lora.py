#!/usr/bin/env python3
"""LoRA SFT starter for IHRM Air. Run locally; CUDA GPU recommended."""
import os
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "ihrm_sft.jsonl"
OUTPUT_DIR = ROOT / "output" / "final-adapter"
MODEL_NAME = os.environ.get("BASE_MODEL", "Qwen/Qwen2.5-3B-Instruct")

def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Training data not found: {DATA_PATH}")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    has_cuda = torch.cuda.is_available()
    quantization = None
    if has_cuda:
        quantization = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        device_map="auto" if has_cuda else None,
        torch_dtype=torch.float16 if has_cuda else torch.float32,
        quantization_config=quantization,
    )
    if not has_cuda:
        print("WARNING: CUDA GPU not detected. Fine-tuning may be extremely slow or run out of memory.")

    dataset = load_dataset("json", data_files=str(DATA_PATH), split="train")
    def format_example(example):
        example["text"] = tokenizer.apply_chat_template(
            example["messages"], tokenize=False, add_generation_prompt=False
        )
        return example
    dataset = dataset.map(format_example)

    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    args = SFTConfig(
        output_dir=str(OUTPUT_DIR.parent / "checkpoints"),
        dataset_text_field="text",
        max_length=2048,
        num_train_epochs=3,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=2e-4,
        logging_steps=1,
        save_strategy="epoch",
        report_to="none",
        gradient_checkpointing=has_cuda,
        fp16=has_cuda,
        bf16=False,
    )
    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=dataset,
        peft_config=lora,
        processing_class=tokenizer,
    )
    trainer.train()
    trainer.model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"LoRA adapter saved to: {OUTPUT_DIR}")
    print("Evaluate on held-out questions before using it for exam preparation.")

if __name__ == "__main__":
    main()
