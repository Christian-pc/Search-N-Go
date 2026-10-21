CREATE DATABASE IF NOT EXISTS SearchNGO;

USE SearchNGO;

CREATE TABLE Users (
    UserId INT AUTO_INCREMENT PRIMARY KEY,
    FirstName VARCHAR(50) NOT NULL,
    LastName VARCHAR(50) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('customer', 'store', 'admin') NOT NULL DEFAULT 'customer',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Categories (
    CategoryId INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE Products (
    ProductId INT AUTO_INCREMENT PRIMARY KEY,
    ProductCode VARCHAR(50) NOT NULL UNIQUE,
    ProductName VARCHAR(150) NOT NULL,
    BrandName VARCHAR(100) NOT NULL,
    Description TEXT,
    Price DECIMAL(10,2) NOT NULL CHECK (Price >= 0),
    ImageUrl VARCHAR(255),
    CategoryId INT NOT NULL,
    INDEX idx_product_name (ProductName),
    FOREIGN KEY (CategoryId)
        REFERENCES Categories(CategoryId)
);

CREATE TABLE Inventory (
    InventoryId INT AUTO_INCREMENT PRIMARY KEY,
    ProductId INT NOT NULL UNIQUE,
    QuantityAvailable INT NOT NULL DEFAULT 0 CHECK (QuantityAvailable >= 0),
    LastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductId)
        REFERENCES Products(ProductId)
        ON DELETE CASCADE
);

CREATE TABLE ProductReviews (
    ReviewId INT AUTO_INCREMENT PRIMARY KEY,
    ProductId INT NOT NULL,
    UserId INT NOT NULL,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    ReviewText TEXT,
    ReviewDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ProductId)
        REFERENCES Products(ProductId)
        ON DELETE CASCADE,
    FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE
);

CREATE TABLE SearchHistory (
    HistoryId INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    SearchTerm VARCHAR(255) NOT NULL,
    SearchDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE
);

CREATE TABLE FavoriteProducts (
    FavoriteId INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    ProductId INT NOT NULL,
    UNIQUE (UserId, ProductId),
    FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE,
    FOREIGN KEY (ProductId)
        REFERENCES Products(ProductId)
        ON DELETE CASCADE
);

/* Lets the app issue a new short-lived login token without asking the user to log in again.
   Only a SHA-256 hash of the refresh token is stored, never the token itself. */
CREATE TABLE RefreshTokens (
    TokenId INT AUTO_INCREMENT PRIMARY KEY,
    UserId INT NOT NULL,
    TokenHash CHAR(64) NOT NULL UNIQUE,
    ExpiryDate DATETIME NOT NULL,
    FOREIGN KEY (UserId)
        REFERENCES Users(UserId)
        ON DELETE CASCADE
);