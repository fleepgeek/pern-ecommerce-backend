import { v2 as cloudinary } from "cloudinary";

const folder = "PERN_ecommerce";

export const uploadImageToCloud = async (imageFile: Express.Multer.File) => {
  const base64Image = imageFile.buffer.toString("base64");
  const imageDataURI = `data:${imageFile.mimetype};base64,${base64Image}`;
  const result = await cloudinary.uploader.upload(imageDataURI, { folder });
  return result.url;
};

export const deleteImageFromCloud = async (imageUrl: String) => {
  const pathArray = imageUrl.split("/");
  const name = pathArray[pathArray.length - 1].split(".")[0];
  const publicId = `${folder}/${name}ddd`;
  await cloudinary.uploader.destroy(publicId, {
    invalidate: true,
  });
};
