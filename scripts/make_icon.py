from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

S = 512
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# Background plate
d.rounded_rectangle((18, 18, S - 18, S - 18), radius=96, fill=(16, 20, 25, 255), outline=(217, 173, 92, 255), width=14)

# Red angular accent behind the lettering
d.polygon([(70, 360), (442, 150), (442, 250), (70, 460)], fill=(196, 48, 54, 255))

# Inner dark panel for contrast
d.rounded_rectangle((60, 110, S - 60, S - 110), radius=50, fill=(14, 17, 21, 235))

font_path = Path("C:/Windows/Fonts/arialbd.ttf")
font = ImageFont.truetype(str(font_path), 250) if font_path.exists() else ImageFont.load_default()
text = "D2"
box = d.textbbox((0, 0), text, font=font)
w, h = box[2] - box[0], box[3] - box[1]
x = (S - w) / 2 - box[0]
y = (S - h) / 2 - box[1] - 10
d.text((x + 5, y + 5), text, font=font, fill=(120, 30, 34, 255))
d.text((x, y), text, font=font, fill=(238, 241, 244, 255))

# Small gold notch
d.ellipse((S - 128, 70, S - 74, 124), fill=(217, 173, 92, 255))

out = Path(__file__).resolve().parent.parent / "build" / "icon.ico"
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("saved", out)
