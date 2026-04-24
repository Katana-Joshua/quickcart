-- User profile image: base64 in DB and/or external URL. Run once.
ALTER TABLE users
  ADD COLUMN profile_image_data LONGTEXT NULL
    COMMENT 'JPEG/PNG as base64 when uploaded' AFTER phone,
  ADD COLUMN profile_image_url VARCHAR(500) NULL
    COMMENT 'Optional external image URL' AFTER profile_image_data;
