-- Widen labels.color to allow the 8 "light" variants alongside the base 8.
-- Paired with the --label-{hue}-light design tokens and the LABEL_COLORS_LIGHT
-- palette on the client.
alter table public.labels drop constraint if exists labels_color_check;
alter table public.labels add constraint labels_color_check
  check (color = any (array[
    'red','orange','yellow','green','blue','purple','pink','gray',
    'red-light','orange-light','yellow-light','green-light','blue-light','purple-light','pink-light','gray-light'
  ]));
