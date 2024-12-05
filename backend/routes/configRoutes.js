const express = require('express');
const router = express.Router();

router.get('/s3-config', (req, res) => {
  res.json({
    bucketName: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION
  });
});

module.exports = router;
