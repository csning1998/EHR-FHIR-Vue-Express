INSERT INTO patients (
    pid, active, family_name, given_name, telecom, gender, birthday, address, email, postal_code, country, preferred_language, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone
) VALUES
-- Middle Ages (5 items)
('MA00100001', TRUE, 'Plantagenet', 'Richard', '0912345678', 'Male', '1157-09-08', 'Oxford, England', 'richard.lionheart@example.com', 'OX1', 'England', 'English', 'Eleanor of Aquitaine', 'Mother', '0912111222'), -- Richard I (the Lionheart), from Wikipedia
('MA00200002', TRUE, 'Capet', 'Joan', '0913456789', 'Female', '1293-01-14', 'Navarre, Spain', 'joan.navarre@example.com', '31001', 'Spain', 'French', 'Philip IV', 'Father', '0912233445'), -- Joan of Navarre, from Wikipedia
('MA00300003', TRUE, 'Hohenstaufen', 'Frederick', '0914567890', 'Male', '1194-12-26', 'Jesi, Italy', 'frederick.ii@example.com', '60035', 'Italy', 'Latin', 'Constance of Aragon', 'Spouse', '0912344556'), -- Frederick II (Holy Roman Emperor), from Wikipedia
('MA00600044', TRUE, 'de Lusignan', 'Isabella', '0915678901', 'Female', '1214-10-09', 'Jerusalem', 'isabella.jerusalem@example.com', '91000', 'Kingdom of Jerusalem', 'French', 'Frederick II', 'Spouse', '0913455667'), -- Isabella II, from Wikipedia
('MA00662225', TRUE, 'Bruce', 'Robert', '0916789012', 'Male', '1274-07-11', 'Turnberry Castle, Scotland', 'robert.bruce@example.com', 'KA26', 'Scotland', 'Scots', 'Isabella of Mar', 'Spouse', '0914566778'), -- Robert the Bruce (King of Scotland), from Wikipedia

-- Renaissance and Early Modern (5 entries)
('RE00100001', TRUE, 'Tudor', 'Henry', '0917890123', 'Male', '1491-06-28', 'Greenwich, England', 'henry.viii@example.com', 'SE10', 'England', 'English', 'Catherine of Aragon', 'Spouse', '0915677889'), -- Henry VIII, from Wikipedia
('RE00200002', TRUE, 'de Medici', 'Catherine', '0918901234', 'Female', '1519-04-13', 'Florence, Italy', 'catherine.medici@example.com', '50123', 'Italy', 'Italian', 'Henry II', 'Spouse', '0916788990'), -- Catherine de Medici, from Wikipedia
('RE00300003', TRUE, 'da Vinci', 'Leonardo', '0919012345', 'Male', '1452-04-15', 'Vinci, Italy', 'leonardo.davinci@example.com', '50059', 'Italy', 'Italian', 'Francesco Melzi', 'Apprentice', '0917899001'), -- Leonardo da Vinci, from Wikipedia
('RE00400004', TRUE, 'Habsburg', 'Charles', '0920123456', 'Male', '1500-02-24', 'Ghent, Flanders', 'charles.v@example.com', '9000', 'Holy Roman Empire', 'German', 'Isabella of Portugal', 'Spouse', '0918900112'), -- Charles V (Holy Roman Emperor), from Wikipedia
('RE00500005', TRUE, 'Stuart', 'Mary', '0921234567', 'Female', '1542-12-08', 'Linlithgow Palace, Scotland', 'mary.stuart@example.com', 'EH49', 'Scotland', 'French', 'Francis II', 'Spouse', '0920011223'), -- Mary Stuart (Queen of Scots), from Wikipedia

-- Industrial Revolution and Modern Times (5 items)
('IR00100001', TRUE, 'Watt', 'James', '0922345678', 'Male', '1736-01-19', 'Greenock, Scotland', 'james.watt@example.com', 'PA15', 'United Kingdom', 'English', 'Margaret Watt', 'Spouse', '0921122334'), -- James Watt, from Wikipedia
('IR00200002', TRUE, 'Curie', 'Marie', '0923456789', 'Female', '1867-11-07', 'Warsaw, Poland', 'marie.curie@example.com', '00-001', 'Poland', 'Polish', 'Pierre Curie', 'Spouse', '0922233445'), -- Marie Curie, from Wikipedia
('IR00300003', TRUE, 'Edison', 'Thomas', '0924567890', 'Male', '1847-02-11', 'Milan, Ohio, USA', 'thomas.edison@example.com', '44846', 'United States', 'English', 'Mina Edison', 'Spouse', '0923344556'), -- Thomas Edison, from Wikipedia
('IR00400004', TRUE, 'Tesla', 'Nikola', '0925678901', 'Male', '1856-07-10', 'Smiljan, Croatia', 'nikola.tesla@example.com', '53291', 'United States', 'Serbian', 'None', 'None', NULL), -- Nikola Tesla, from Wikipedia
('IR00500005', TRUE, 'Darwin', 'Charles', '0926789012', 'Male', '1809-02-12', 'Shrewsbury, England', 'charles.darwin@example.com', 'SY3', 'United Kingdom', 'English', 'Emma Darwin', 'Spouse', '0924455667'), -- Charles Darwin, from Wikipedia

-- Cold War (5 entries)
('CW00001111', TRUE, 'Kennedy', 'John', '0927890123', 'Male', '1917-05-29', 'Brookline, Massachusetts, USA', 'john.kennedy@example.com', '02446', 'United States', 'English', 'Jacqueline Kennedy', 'Spouse', '0925566778'), -- John Kennedy, from Wikipedia
('CW00000002', TRUE, 'Khrushchev', 'Nikita', '0928901234', 'Male', '1894-04-15', 'Kalinovka, Russia', 'nikita.khrushchev@example.com', '305501', 'Soviet Union', 'Russian', 'Nina Khrushcheva', 'Spouse', '0926677889'), -- Nikita Khrushchev, from Wikipedia
('CW00000333', TRUE, 'Mandela', 'Nelson', '0929012345', 'Male', '1918-07-18', 'Mvezo, South Africa', 'nelson.mandela@example.com', '5099', 'South Africa', 'Xhosa', 'Winnie Mandela', 'Spouse', '0927788990'), -- Nelson Mandela, from Wikipedia
('CW00000444', TRUE, 'Thatcher', 'Margaret', '0930123456', 'Female', '1925-10-13', 'Grantham, England', 'margaret.thatcher@example.com', 'NG31', 'United Kingdom', 'English', 'Denis Thatcher', 'Spouse', '0928899001'), -- Margaret Thatcher, from Wikipedia
('CW50005550', TRUE, 'Gorbachev', 'Mikhail', '0931234567', 'Male', '1931-03-02', 'Privolnoye, Soviet Union', 'mikhail.gorbachev@example.com', '356000', 'Soviet Union', 'Russian', 'Raisa Gorbacheva', 'Spouse', '0929900112'), -- Mikhail Gorbachev, from Wikipedia

('A123456789', TRUE, 'O''Sullivan', 'Ronnie', '0912345678', 'Male', '1975-12-05', 'Wordsley, West Midlands, England', 'ronnie.osullivan@example.com', 'DY8', 'United Kingdom', 'English', 'Maria Sullivan', 'Spouse', '0911123456'),
('AB12345678', TRUE, 'Uncle', 'Roger', '0987654321', 'Male', '1991-03-15', '7th Floor Pavilion KL, Pavilion Elite, Bukit Bintang, Kuala Lumpur, Malaysia', 'roger.uncle@example.com', '55100', 'Malaysia', 'English', 'Auntie Helen', 'Sister', '0987111222'),
('CE12345678', TRUE, 'Musk', 'Elon', '0913467985', 'Male', '1971-06-28', 'Starbase, Brownsville, Texas, USA', 'elon.musk@example.com', '78521', 'United States', 'English', 'Maye Musk', 'Mother', '0913123456'),
('DY12345678', TRUE, 'OYang', 'Jimmy', '0928765432', 'Male', '1987-06-11', 'Los Angeles, California, USA', 'jimmy.oyang@example.com', '90001', 'United States', 'English', 'Mrs. OYang', 'Mother', '0928123456'),
('TT56712345', TRUE, 'Chen', 'Brett', '0932111234', 'Male', '1992-07-21', 'Taipei, Taiwan', 'brett.chen@example.com', '100', 'Taiwan', 'Mandarin', 'Eddy Chen', 'Brother', '0932111111'),
('VV89012345', TRUE, 'Chen', 'Eddy', '0921234567', 'Male', '1993-09-09', 'Melbourne, Australia', 'eddy.chen@example.com', '3000', 'Australia', 'English', 'Brett Chen', 'Brother', '0921999999'),
('FF12347891', TRUE, 'Oliver', 'Jamie', '0987321654', 'Male', '1975-05-27', 'Essex, England', 'jamie.oliver@example.com', 'CM13', 'United Kingdom', 'English', 'Jools Oliver', 'Spouse', '0987654321'),
('GR45612378', TRUE, 'Ramsay', 'Gordon', '0978654321', 'Male', '1966-11-08', 'London, England', 'gordon.ramsay@example.com', 'WC2N', 'United Kingdom', 'English', 'Tana Ramsay', 'Spouse', '0978111111'),
('SH09876123', TRUE, 'He', 'Steven', '0912233445', 'Male', '1994-08-13', 'New York, USA', 'steven.he@example.com', '10001', 'United States', 'English', 'Mr. He', 'Father', '0912123456'),
('WS12345678', TRUE, 'Smith', 'Will', '0967451238', 'Male', '1968-09-25', 'Calabasas, California, USA', 'will.smith@example.com', '91302', 'United States', 'English', 'Jada Pinkett Smith', 'Spouse', '0967445678'),
('BL19320227', TRUE, 'Lee', 'Bruce', '0912345678', 'Male', '1940-11-27', 'San Francisco, California, USA', 'bruce.lee@example.com', '94109', 'United States', 'English', 'Linda Lee', 'Spouse', '0912111222'),
('DT12345678', TRUE, 'Trump', 'Donald', '0911122334', 'Male', '1946-06-14', '725 Fifth Avenue, New York, NY, USA', 'donald.trump@example.com', '10022', 'United States', 'English', 'Melania Trump', 'Spouse', '0911234567'),
('JB56781234', TRUE, 'Biden', 'Joe', '0912456789', 'Male', '1942-11-20', '1600 Pennsylvania Avenue NW, Washington, DC, USA', 'joe.biden@example.com', '20500', 'United States', 'English', 'Jill Biden', 'Spouse', '0912123456'),
('A!12345678', TRUE, 'WrongData4Test', 'ModifyToTest', '0487654321', 'Female', '1985-05-15', 'This is invalid data for testing purposes only', 'invalid-email@', 'ABCDE', 'Unknown', 'UnknownLanguage', NULL, 'Undefined', '12345');
;
