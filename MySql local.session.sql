use mis_icons_rental;
INSERT INTO inventory_items (
    id,
    name,
    category,
    description,
    status,
    image,
    date_added,
    last_updated
  )
VALUES (
    id:int,
    'name:varchar',
    'category:varchar',
    'description:text',
    'status:varchar',
    'image:longtext',
    'date_added:datetime',
    'last_updated:datetime'
  );