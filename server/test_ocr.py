import cv2
import numpy as np
from paddleocr import PaddleOCR

# Create a dummy image with text
img = np.zeros((200, 400, 3), dtype=np.uint8)
cv2.putText(img, 'Test NCEC OCR', (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

ocr = PaddleOCR(lang="ar")
# API has changed in v3.7.0, let's use the new .predict() without cls=True
res = ocr.predict(img)

# Print everything to see what the returned object is
for item in res:
    print(item)
    # Let's inspect its attributes since it might be a class
    print(dir(item))
