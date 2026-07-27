-- Immutable BGFF 2025/26 final monthly standings supplied by the commissioner.
-- Safe to run again: this replaces only the 2025/26 archive row.
insert into public.season_final_standings (season, rows, archived_at, archived_by)
values ('2025/26', '[
  {"manager":"Bails","aug":136,"sep":88,"oct":95,"nov":167,"dec":186,"jan":164,"feb":178,"mar":103,"apr":79,"may":143,"total":1339},
  {"manager":"Bruno","aug":93,"sep":92,"oct":90,"nov":102,"dec":144,"jan":162,"feb":112,"mar":89,"apr":91,"may":121,"total":1096},
  {"manager":"Boydy","aug":90,"sep":100,"oct":118,"nov":167,"dec":150,"jan":170,"feb":98,"mar":70,"apr":114,"may":159,"total":1236},
  {"manager":"Dave","aug":108,"sep":75,"oct":93,"nov":107,"dec":135,"jan":128,"feb":130,"mar":85,"apr":127,"may":113,"total":1101},
  {"manager":"Goldie","aug":83,"sep":80,"oct":78,"nov":115,"dec":161,"jan":157,"feb":161,"mar":72,"apr":61,"may":64,"total":1032},
  {"manager":"Lee","aug":139,"sep":95,"oct":140,"nov":148,"dec":184,"jan":170,"feb":219,"mar":92,"apr":104,"may":164,"total":1455},
  {"manager":"Nirav","aug":72,"sep":79,"oct":78,"nov":135,"dec":156,"jan":118,"feb":193,"mar":60,"apr":60,"may":106,"total":1057},
  {"manager":"Nips","aug":94,"sep":74,"oct":87,"nov":179,"dec":152,"jan":150,"feb":144,"mar":94,"apr":85,"may":124,"total":1183},
  {"manager":"Spence","aug":87,"sep":97,"oct":91,"nov":128,"dec":140,"jan":163,"feb":151,"mar":84,"apr":88,"may":134,"total":1163},
  {"manager":"Tim","aug":102,"sep":115,"oct":85,"nov":96,"dec":174,"jan":123,"feb":147,"mar":60,"apr":95,"may":106,"total":1103},
  {"manager":"Trev","aug":134,"sep":112,"oct":113,"nov":139,"dec":176,"jan":157,"feb":205,"mar":114,"apr":89,"may":159,"total":1398}
]'::jsonb, now(), null)
on conflict (season) do update set rows = excluded.rows, archived_at = excluded.archived_at, archived_by = null;
