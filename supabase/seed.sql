-- =====================================================================
-- Spruce demo data: sample cleaners across SA so the map isn't empty.
-- Run AFTER schema.sql. Demo cleaners auto-accept bookings.
-- =====================================================================

insert into public.cleaners
  (display_name, bio, hourly_rate, suburb, city, lat, lng, services, years_experience, is_demo)
values
  ('Thandi M.',   'Detail-focused and calm. I bring my own eco-friendly products and leave kitchens sparkling.', 95,  'Sandton',      'Johannesburg', -26.1076, 28.0567, '{"Standard clean","Deep clean","Laundry & ironing"}', 8, true),
  ('Lerato K.',   'Ironing is my favourite part of the job. Happy to work around pets and kids.',                 80,  'Rosebank',     'Johannesburg', -26.1452, 28.0436, '{"Standard clean","Laundry & ironing"}', 5, true),
  ('Sipho N.',    'Move-out cleans that get your deposit back. Windows and ovens included.',                     110, 'Randburg',     'Johannesburg', -26.0936, 28.0064, '{"Deep clean","Move-in / move-out","Windows"}', 10, true),
  ('Nomsa D.',    'Twelve years in homes around Soweto and Joburg South. Reliable, punctual, thorough.',          75,  'Soweto',       'Johannesburg', -26.2485, 27.8540, '{"Standard clean","Deep clean","Laundry & ironing"}', 12, true),
  ('Grace P.',    'Small offices and apartments. Weekday mornings are best for me.',                             90,  'Braamfontein', 'Johannesburg', -26.1929, 28.0305, '{"Standard clean","Office clean"}', 4, true),
  ('Zanele T.',   'Big family homes are my speciality. I work fast and tidy as I go.',                           100, 'Fourways',     'Johannesburg', -26.0167, 28.0110, '{"Standard clean","Deep clean","Windows"}', 7, true),
  ('Precious L.', 'Friendly and careful with delicate things. Fluent in English, Sesotho and isiZulu.',          85,  'Midrand',      'Johannesburg', -25.9992, 28.1263, '{"Standard clean","Laundry & ironing","Move-in / move-out"}', 6, true),
  ('Ruth A.',     'Student digs and flats around Melville and Auckland Park.',                                   70,  'Melville',     'Johannesburg', -26.1767, 28.0083, '{"Standard clean","Deep clean"}', 3, true),
  ('Busisiwe R.', 'Offices and homes in Pretoria east. I can come early before work starts.',                    85,  'Hatfield',     'Pretoria',     -25.7487, 28.2380, '{"Standard clean","Office clean","Windows"}', 9, true),
  ('Johanna V.',  'Deep cleans and spring cleans. I love a before-and-after.',                                   95,  'Centurion',    'Pretoria',     -25.8603, 28.1894, '{"Deep clean","Move-in / move-out","Laundry & ironing"}', 11, true),
  ('Amahle Z.',   'Holiday flats and Airbnbs on the Atlantic seaboard. Quick turnarounds between guests.',       120, 'Sea Point',    'Cape Town',    -33.9150, 18.3870, '{"Standard clean","Move-in / move-out","Laundry & ironing"}', 6, true),
  ('Fatima S.',   'Calm, quiet and thorough. Pet hair is no problem.',                                          100, 'Observatory',  'Cape Town',    -33.9380, 18.4720, '{"Standard clean","Deep clean"}', 8, true),
  ('Charlene B.', 'Southern suburbs family homes, weekly or once-off.',                                         105, 'Claremont',    'Cape Town',    -33.9810, 18.4650, '{"Standard clean","Deep clean","Windows","Laundry & ironing"}', 14, true),
  ('Nokuthula G.','Coastal homes around Umhlanga. Sliding doors and windows a speciality.',                      95,  'Umhlanga',     'Durban',       -29.7230, 31.0840, '{"Standard clean","Windows","Deep clean"}', 7, true),
  ('Priya N.',    'Offices and homes in Berea and Morningside. Same-week availability.',                         85,  'Morningside',  'Durban',       -29.8250, 31.0130, '{"Standard clean","Office clean","Laundry & ironing"}', 5, true);

-- Varied working schedules so availability is visible in the demo
update public.cleaners set work_days = '{1,2,3,4,5}', work_start = '08:00', work_end = '16:00' where display_name in ('Grace P.', 'Busisiwe R.', 'Priya N.');
update public.cleaners set work_days = '{0,1,2,3,4,5,6}', work_start = '07:00', work_end = '18:00' where display_name in ('Thandi M.', 'Amahle Z.');
update public.cleaners set work_days = '{2,3,4,5,6}', work_start = '09:00', work_end = '17:00' where display_name in ('Sipho N.', 'Fatima S.');
update public.cleaners set work_days = '{1,3,5,6}', work_start = '07:00', work_end = '15:00' where display_name in ('Ruth A.', 'Nokuthula G.');

-- Sample reviews (attached to demo cleaners only)
insert into public.reviews (cleaner_id, reviewer_name, rating, comment)
select c.id, r.name, r.rating, r.comment
from (values
  ('Thandi M.',   'Kagiso',  5, 'Kitchen looked brand new. Will book again.'),
  ('Thandi M.',   'Megan',   5, 'On time and super thorough.'),
  ('Thandi M.',   'Ayanda',  4, 'Great job, ran a little late.'),
  ('Lerato K.',   'David',   5, 'Best ironing I''ve had. Shirts were perfect.'),
  ('Lerato K.',   'Naledi',  4, 'Lovely and friendly.'),
  ('Sipho N.',    'Jason',   5, 'Got my full deposit back. Thank you!'),
  ('Sipho N.',    'Palesa',  5, 'Windows are spotless.'),
  ('Nomsa D.',    'Tumi',    5, 'Reliable every single week.'),
  ('Nomsa D.',    'Bongani', 5, 'Very professional.'),
  ('Nomsa D.',    'Lindiwe', 4, 'Good work, would recommend.'),
  ('Grace P.',    'Ethan',   4, 'Office looked great Monday morning.'),
  ('Zanele T.',   'Refilwe', 5, 'Handled our huge house in one day.'),
  ('Zanele T.',   'Chris',   4, 'Fast and tidy.'),
  ('Precious L.', 'Mpho',    5, 'Careful with my grandmother''s china.'),
  ('Ruth A.',     'Sam',     4, 'Good value for a student flat.'),
  ('Busisiwe R.', 'Karabo',  5, 'Came at 6:30 so we could open on time.'),
  ('Johanna V.',  'Liezl',   5, 'Spring clean was incredible.'),
  ('Johanna V.',  'Pieter',  4, 'Very thorough.'),
  ('Amahle Z.',   'Olivia',  5, 'Guest turnover in two hours, flawless.'),
  ('Amahle Z.',   'Yusuf',   5, 'Always reliable.'),
  ('Fatima S.',   'Leah',    5, 'Dog hair: gone. Amazing.'),
  ('Charlene B.', 'Gareth',  5, 'Fourteen years of experience shows.'),
  ('Charlene B.', 'Anele',   4, 'Great with our kids around.'),
  ('Nokuthula G.','Rajesh',  5, 'Sliding doors have never been this clean.'),
  ('Priya N.',    'Sizwe',   4, 'Booked same week, no problem.')
) as r(cleaner, name, rating, comment)
join public.cleaners c on c.display_name = r.cleaner and c.is_demo;

do $$
declare r record;
begin
  for r in select id from public.cleaners where is_demo loop
    perform public.refresh_cleaner_rating(r.id);
  end loop;
end $$;
