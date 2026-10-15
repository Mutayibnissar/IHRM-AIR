# Local LoRA fine-tuning

1. Install the packages in `../README.md`.
2. Inspect and expand `ihrm_sft.jsonl`. Each line must be a JSON object with a `messages` array.
3. Run `python train_lora.py`.
4. Inspect the saved adapter and evaluate it on a separate set of questions not present in training.

This is a starter script, not a guarantee of a successful run on every hardware/OS combination. CUDA GPU training is the recommended path. Check the model license and memory requirements before downloading a base model. Do not commit private datasets or secrets.
