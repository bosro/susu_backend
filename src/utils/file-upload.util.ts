// src/utils/file-upload.util.ts
import { cloudinary } from '../config/cloudinary';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';


export class FileUploadUtil {
  static async uploadImage(
    buffer: Buffer,
    folder: string
  ): Promise<{ url: string; publicId: string }> {
    // Optimize image
    const optimizedBuffer = await sharp(buffer)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uuidv4(),
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result!.secure_url,
              publicId: result!.public_id,
            });
          }
        }
      );

      uploadStream.end(optimizedBuffer);
    });
  }

  static async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  static extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
}