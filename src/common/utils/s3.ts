import { S3 } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import { env } from "./envConfig";

const s3 = new S3({
	region: env.AWS_REGION,
	credentials: {
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
	},
});

export const uploadFileS3 = ({
	filename,
	filepath,
	body,
	contentType,
}: {
	filename: string;
	filepath?: string;
	body?: Buffer;
	contentType: string;
}) => {
	const file = filepath ? fs.readFileSync(filepath) : undefined;
	const parallelUploads3 = new Upload({
		client: s3,
		params: { Bucket: env.AWS_BUCKET_NAME, Key: filename, Body: body ?? file, ContentType: contentType },
		queueSize: 4,
		leavePartsOnError: false,
	});

	return parallelUploads3.done();
};
