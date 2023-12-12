import { join } from 'node:path';
import { existsSync, realpathSync, readFileSync } from 'node:fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { buildInfo as buildBuildInfo } from '../broccoli/build-info.js';
import projectFileMap from '../config/s3ProjectConfig.js';

const buildInfo = buildBuildInfo();

// To invoke this from the commandline you need the following to env vars to exist:
//
// S3_BUCKET_NAME
// S3_SECRET_ACCESS_KEY
// S3_ACCESS_KEY_ID
//
// Once you have those, you execute with the following:
//
// ```sh
// ./bin/publish-to-s3.mjs
// ```

class S3Publisher {
  projectFileMap;
  commit;
  channel;
  bucketName;

  date = new Date().toISOString().replace(/-/g, '').replace(/T.+/, '');
  constructor(options) {
    if (!options.projectFileMap) {
      throw new Error('You must pass in a function with a project file map to use!');
    }

    new Date().toISOString().replace(/-/g, '').replace(/T.+/, '');
    const s3Config = {
      bucketName: process.env.S3_BUCKET_NAME,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };

    if (!s3Config.bucketName || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
      throw new Error('Missing AWS credentials.');
    }

    this.projectFileMap = options.projectFileMap;
    this.commit = options.commit;
    this.channel = options.channel;
    this.bucketName = s3Config.bucketName;

    this.s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  async publish() {
    try {
      const files = this.projectFileMap(this.commit, this.date);
      for (const file in files) {
        const localDests = files[file].destinations[this.channel || 'wildcard'];

        if (!localDests) {
          throw new Error(
            `${this.channel} is not a supported branch and no wildcard entry has been specified`
          );
        }
        if (!localDests.length) {
          throw new Error('There are no locations for this branch');
        }

        for (const destination in localDests) {
          await this.uploader(localDests[destination], file, files);
        }
      }
    } catch (err) {
      exitGracefully(err);
    }
  }

  async uploader(destination, file, files) {
    let filePath = join(process.cwd(), 'dist', file);

    if (!existsSync(filePath)) {
      throw new Error("FilePath: '" + filePath + "' doesn't exist!");
    }

    filePath = realpathSync(filePath);

    const data = readFileSync(filePath);

    await this.uploadFile(data, files[file].contentType, destination);
  }

  async uploadFile(data, type, destination) {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: destination,
      Body: data,
      ContentType: type,
      ACL: 'public-read',
    });

    await this.s3.send(command);
  }
}

if (!buildInfo.isBuildForTag) {
  const publisher = new S3Publisher({
    projectFileMap,
    commit: buildInfo.sha,
    channel: buildInfo.channel,
  });

  await publisher.publish();
}

function exitGracefully(err) {
  console.log(err); // eslint-disable-line no-console
  process.exit(1); // eslint-disable-line n/no-process-exit
}
