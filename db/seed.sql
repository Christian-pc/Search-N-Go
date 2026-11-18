USE SearchNGO;

INSERT INTO Categories (CategoryName) VALUES ('Dairy'), ('Bakery');

INSERT INTO Products (ProductCode, ProductName, BrandName, Description, Price, CategoryId) VALUES
                                                                                               ('MLK-001', 'Whole Milk 2L', 'Dairyland', 'Fresh homogenized whole milk in a 2 litre carton.', 4.99, 1),
                                                                                               ('BRD-014', 'Whole Wheat Bread', 'Sunrise Bakery', 'Soft sliced whole wheat bread, baked fresh daily.', 3.49, 2),
                                                                                               ('EGG-112', 'Large Eggs (12)', 'Prairie Farms', 'One dozen large Grade A eggs.', 5.29, 1),
                                                                                               ('CHS-220', 'Old Cheddar Cheese', 'Dairyland', 'Aged old cheddar, 400 g block.', 7.99, 1);

INSERT INTO Inventory (ProductId, QuantityAvailable) VALUES (1, 24), (2, 3), (3, 0), (4, 12);

-- Placeholder users so the sample reviews have an author. These can't log in.
INSERT INTO Users (FirstName, LastName, Email, PasswordHash) VALUES
                                                                 ('Sam', 'Test', 'sam@example.com', 'not-a-real-hash'),
                                                                 ('Priya', 'Test', 'priya@example.com', 'not-a-real-hash'),
                                                                 ('Alex', 'Test', 'alex@example.com', 'not-a-real-hash');

INSERT INTO ProductReviews (ProductId, UserId, Rating, ReviewText) VALUES
                                                                       (1, 1, 5, 'Always fresh and a good price.'),
                                                                       (1, 2, 4, 'Good milk, wish it came in bigger sizes.'),
                                                                       (2, 3, 3, 'Tasty but it runs out fast.');