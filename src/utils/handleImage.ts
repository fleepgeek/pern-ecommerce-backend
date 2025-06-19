import { v2 as cloudinary } from "cloudinary";

const folder = "mern_ecommerce";

export const uploadImage = async (imageFile: Express.Multer.File) => {
  const base64Image = imageFile.buffer.toString("base64");
  const imageDataURI = `data:${imageFile.mimetype};base64,${base64Image}`;
  const result = await cloudinary.uploader.upload(imageDataURI, { folder });

  return result.url;
};
