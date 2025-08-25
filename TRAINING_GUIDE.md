# Qwen LoRA Training Guide

## ZIP File Structure

Your training ZIP file should contain:

```
training_data.zip
├── image1.jpg
├── image1.txt
├── image2.png
├── image2.txt
├── image3.webp
├── image3.txt
└── ...
```

## File Requirements

### Images
- **Formats**: PNG, JPG, JPEG, WEBP
- **Quantity**: At least 10 images (more is better, 50-200 ideal)
- **Quality**: High resolution, clear, well-lit images
- **Consistency**: Similar style, lighting, or subject matter
- **Naming**: Any valid filename (e.g., image1.jpg, photo_001.png)

### Caption Files
- **Format**: Plain text (.txt) files
- **Naming**: Must match image filename exactly
  - image1.jpg → image1.txt
  - photo_001.png → photo_001.txt
- **Content**: Short, descriptive captions (1-3 sentences)
- **Style**: Be consistent in description style

## Caption Examples

### Good Captions
```
image1.txt: "A professional headshot of a person in aclu style with clean lighting and neutral background"
image2.txt: "aclu style logo design with bold typography and geometric shapes"
image3.txt: "Modern aclu style poster featuring minimalist design elements"
```

### Caption Tips
- Include your **trigger phrase** consistently (e.g., "aclu style", "mybrand style")
- Describe key visual elements (colors, composition, style)
- Be specific but concise
- Maintain consistent terminology

## Training Parameters

### Steps (100-10000)
- **100-500**: Quick test, lower quality
- **1000-2000**: Good balance (recommended)
- **3000-5000**: High quality, longer training
- **5000+**: Professional results, very long training

### Learning Rate (0.00001-0.01)
- **0.0001**: Very conservative, stable
- **0.0005**: Recommended default
- **0.001**: Faster learning
- **0.005+**: Aggressive, risk of overfitting

### Trigger Phrase
- **Purpose**: Unique phrase to activate your style
- **Examples**: "aclu style", "mybrand", "mystyle"
- **Usage**: Include in all captions and future prompts
- **Fallback**: Used for images without .txt files

## Best Practices

1. **Curate carefully**: Quality over quantity
2. **Consistent style**: Similar aesthetic across images
3. **Diverse poses/angles**: Avoid overfitting to single view
4. **Clear captions**: Accurate, descriptive text
5. **Test iteratively**: Start with fewer steps, then increase
6. **Save results**: Download both LoRA and config files

## Using Your Trained LoRA

After training completes:
1. Download the LoRA file (.safetensors)
2. Download the config file (.json)
3. Use the LoRA URL in compatible endpoints
4. Include your trigger phrase in prompts
5. Experiment with different prompts and settings

## Troubleshooting

### Common Issues
- **No .txt files**: Use trigger phrase as default caption
- **Training fails**: Check image formats and ZIP structure
- **Poor results**: Increase steps or improve caption quality
- **Overfitting**: Use lower learning rate or fewer steps
