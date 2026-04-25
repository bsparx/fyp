import cloudinary from "./cloudinary";

function canUploadToCloudinary(): boolean {
  return Boolean(
    process.env.CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  );
}

export async function uploadFileToCloudinary(args: {
  dataUri: string;
  fileType: "pdf" | "image";
  folder: string;
  publicId: string;
}): Promise<string | null> {
  if (!canUploadToCloudinary()) {
    console.warn(
      "Cloudinary environment variables are not fully configured. Skipping upload.",
    );
    return null;
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(args.dataUri, {
      resource_type: args.fileType === "pdf" ? "raw" : "image",
      folder: args.folder,
      public_id: args.publicId,
    });

    console.log(`Uploaded file to Cloudinary: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed.", error);
    return null;
  }
}
