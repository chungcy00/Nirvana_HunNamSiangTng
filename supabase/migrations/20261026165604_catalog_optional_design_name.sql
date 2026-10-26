-- Design names are optional for both drafts and approved religious design images.
-- Keep name normalization, image approval, religion scope and primary-image rules intact.
ALTER TABLE private.product_images DROP CONSTRAINT IF EXISTS product_images_check1;
