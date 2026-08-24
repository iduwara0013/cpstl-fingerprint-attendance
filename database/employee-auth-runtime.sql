USE [master];
GO

-- Replace this password before running the script.
IF SUSER_ID(N'CPSTLPortalApp') IS NULL
BEGIN
    CREATE LOGIN [CPSTLPortalApp]
    WITH PASSWORD = N'cpstl@2026',
         CHECK_POLICY = ON,
         DEFAULT_DATABASE = [CPSTLPortalDB];
END;
GO

USE [CPSTLPortalDB];
GO

IF DATABASE_PRINCIPAL_ID(N'CPSTLPortalApp') IS NULL
BEGIN
    CREATE USER [CPSTLPortalApp]
    FOR LOGIN [CPSTLPortalApp];
END
ELSE
BEGIN
    ALTER USER [CPSTLPortalApp]
    WITH LOGIN = [CPSTLPortalApp];
END;
GO

IF OBJECT_ID(N'dbo.WebPortalSessions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebPortalSessions
    (
        SessionId BIGINT IDENTITY(1,1) NOT NULL
            CONSTRAINT PK_WebPortalSessions PRIMARY KEY,
        UserId INT NOT NULL,
        TokenHash CHAR(64) NOT NULL,
        ExpiresAt DATETIME2(0) NOT NULL,
        CreatedAt DATETIME2(0) NOT NULL
            CONSTRAINT DF_WebPortalSessions_CreatedAt DEFAULT (SYSDATETIME()),
        LastUsedAt DATETIME2(0) NULL,
        RevokedAt DATETIME2(0) NULL,
        CONSTRAINT FK_WebPortalSessions_User
            FOREIGN KEY (UserId) REFERENCES dbo.WebPortalUsers(UserId) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_WebPortalSessions_TokenHash' AND object_id = OBJECT_ID(N'dbo.WebPortalSessions'))
    CREATE UNIQUE INDEX UX_WebPortalSessions_TokenHash ON dbo.WebPortalSessions(TokenHash);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WebPortalSessions_UserId' AND object_id = OBJECT_ID(N'dbo.WebPortalSessions'))
    CREATE INDEX IX_WebPortalSessions_UserId ON dbo.WebPortalSessions(UserId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_WebPortalSessions_ExpiresAt' AND object_id = OBJECT_ID(N'dbo.WebPortalSessions'))
    CREATE INDEX IX_WebPortalSessions_ExpiresAt ON dbo.WebPortalSessions(ExpiresAt);
GO

GRANT CONNECT TO [CPSTLPortalApp];
GRANT SELECT, INSERT, UPDATE ON dbo.WebPortalUsers TO [CPSTLPortalApp];
GRANT SELECT ON dbo.WebPortalRoles TO [CPSTLPortalApp];
GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.WebPortalSessions TO [CPSTLPortalApp];
GO
