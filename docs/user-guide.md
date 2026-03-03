# User Guide

This guide provides step-by-step walkthroughs for using the three interfaces of Meadow Migration Manager: the command-line interface (CLI), the interactive Terminal UI (TUI), and the browser-based Web UI. Each interface exposes the same underlying services -- schema management, compilation, diffing, migration generation, and deployment -- through a different interaction model.

---

## CLI Walkthroughs

The CLI is the primary interface for scripting and automation. All commands use the `meadow-migration` binary (installed globally via `npm install -g meadow-migrationmanager`).

### Setting Up Your First Schema

This walkthrough creates a five-table bookstore schema, adds it to the library, compiles it, and verifies the result.

**Step 1 -- Create a MicroDDL file**

Create a file called `bookstore.ddl` with the following MicroDDL content:

```
!Book
	@IDBook
	$Title 200
	$Genre 128
	$ISBN 20

!Author
	@IDAuthor
	$FirstName 100
	$LastName 100
	$Bio 2000

!BookAuthorJoin
	@IDBookAuthorJoin
	#IDBook -> Book.IDBook
	#IDAuthor -> Author.IDAuthor

!BookPrice
	@IDBookPrice
	#IDBook -> Book.IDBook
	$Currency 3
	$Price 12

!Review
	@IDReview
	#IDBook -> Book.IDBook
	$ReviewerName 200
	$Rating 5
	$Body 4000
```

Each `!` line declares a table, `@` declares an auto-increment primary key, `$` declares a string column with a max length, and `#` declares a foreign key with a `->` reference to the target table and column.

**Step 2 -- Add the schema to the library**

```bash
meadow-migration add-schema bookstore ./bookstore.ddl
```

This reads the DDL file and stores it in `.meadow-migration-schemas.json` in the current directory.

**Step 3 -- Compile the schema**

```bash
meadow-migration compile bookstore
```

Compilation parses the MicroDDL through Stricture, producing a structured schema object with table definitions, column metadata, indices, and foreign key mappings. It also generates Meadow package JSON for each table.

**Step 4 -- Verify the library**

```bash
meadow-migration list-schemas
```

The output shows the bookstore schema with its compilation status and a timestamp indicating when it was last compiled:

```
Schema Library:
  bookstore  [compiled 2026-03-02T14:30:00.000Z]
    Tables: Book, Author, BookAuthorJoin, BookPrice, Review
```

---

### Evolving a Schema

This walkthrough adds a second version of the bookstore schema, compares the two versions, and generates migration SQL.

**Step 1 -- Create the updated DDL file**

Create a file called `bookstore-v2.ddl` with the following changes from the original:

- `Title` column on `Book` increased from 200 to 500 characters
- Two new columns added to `Book`: `Edition` and `PageCount`
- A new `Publisher` table added

```
!Book
	@IDBook
	$Title 500
	$Genre 128
	$ISBN 20
	$Edition 50
	$PageCount 10

!Author
	@IDAuthor
	$FirstName 100
	$LastName 100
	$Bio 2000

!BookAuthorJoin
	@IDBookAuthorJoin
	#IDBook -> Book.IDBook
	#IDAuthor -> Author.IDAuthor

!BookPrice
	@IDBookPrice
	#IDBook -> Book.IDBook
	$Currency 3
	$Price 12

!Review
	@IDReview
	#IDBook -> Book.IDBook
	$ReviewerName 200
	$Rating 5
	$Body 4000

!Publisher
	@IDPublisher
	$Name 200
	$Country 100
```

**Step 2 -- Add the new version to the library**

```bash
meadow-migration add-schema bookstore-v2 ./bookstore-v2.ddl
```

**Step 3 -- Compile the new version**

```bash
meadow-migration compile bookstore-v2
```

**Step 4 -- Diff the two schemas**

```bash
meadow-migration diff bookstore bookstore-v2
```

The diff output shows:

- **Publisher** -- table added (exists only in bookstore-v2)
- **Book** -- table modified (Title column size changed from 200 to 500, Edition and PageCount columns added)
- All other tables remain unchanged

**Step 5 -- Generate a MySQL migration script**

```bash
meadow-migration generate-script bookstore bookstore-v2 -t MySQL
```

This prints the generated SQL to stdout. The script contains `CREATE TABLE` statements for the Publisher table and `ALTER TABLE` statements for the Book table modifications.

**Step 6 -- Save a PostgreSQL migration script to a file**

```bash
meadow-migration generate-script bookstore bookstore-v2 -t PostgreSQL -o migration.sql
```

The `-o` flag writes the migration SQL to the specified file instead of printing it to the console. Supported database types for the `-t` flag are `MySQL`, `PostgreSQL`, `MSSQL`, and `SQLite`.

---

### Managing Database Connections

Connection configurations are stored in a local library file and used by the `introspect`, `deploy`, and `migrate` commands.

**Step 1 -- Add a MySQL connection**

```bash
meadow-migration add-connection local-mysql -t MySQL -s 127.0.0.1 -p 3306 -u root -w secret -d bookstore
```

Options:

| Flag | Description | Default |
|---|---|---|
| `-t` | Database type (MySQL, PostgreSQL, MSSQL, SQLite) | SQLite |
| `-s` | Server hostname | 127.0.0.1 |
| `-p` | Server port | (none) |
| `-u` | Database user | (none) |
| `-w` | Database password | (none) |
| `-d` | Database name | (none) |

**Step 2 -- Add a SQLite connection**

```bash
meadow-migration add-connection dev-sqlite -t SQLite -d ./dev.db
```

For SQLite connections, the `-d` flag specifies the path to the database file. The `-s`, `-p`, `-u`, and `-w` flags are not needed.

**Step 3 -- List connections**

```bash
meadow-migration list-connections
```

The output shows all stored connections with their type and configuration:

```
Connection Library:
  local-mysql   MySQL    127.0.0.1:3306  bookstore
  dev-sqlite    SQLite   ./dev.db
```

**Step 4 -- Use connections with database commands**

Connections are referenced by name in the `introspect`, `deploy`, and `migrate` commands. These commands require the appropriate database provider packages to be installed (for example, the `mysql2` package for MySQL connections).

```bash
meadow-migration introspect local-mysql
meadow-migration deploy bookstore local-mysql
meadow-migration migrate bookstore local-mysql
```

---

## Terminal UI Walkthrough

The Terminal UI provides an interactive console-based interface for all migration management operations, built on `blessed` and `pict-terminalui`.

### Launching the TUI

```bash
meadow-migration tui
```

Or using the alias:

```bash
meadow-migration ui
```

### Layout

The TUI renders a four-region layout: a header bar, a sidebar navigation list (20% width), a scrollable content area (80% width), and a status bar.

```
+--------------------------------------------------------------+
|  Meadow Migration Manager                        [q] quit    |
+----------------+---------------------------------------------+
| Schemas        |                                             |
| Connections    |  (Content area changes based on             |
| DDL Editor     |   sidebar selection)                        |
| Meadow JSON    |                                             |
| Visualizer     |                                             |
| Deploy         |                                             |
| Migrate        |                                             |
| Script         |                                             |
| Introspect     |                                             |
+----------------+---------------------------------------------+
| Status: 2 schemas loaded | 1 connection                     |
+--------------------------------------------------------------+
```

### Navigation

| Key | Action |
|---|---|
| Up/Down arrows | Navigate sidebar items |
| Enter | Select sidebar item and display in content area |
| Tab | Toggle focus between sidebar and content area |
| q or Ctrl-C | Quit the application |

Mouse support is also enabled for sidebar selection and content area scrolling.

### Sidebar Panels

The nine sidebar items each display a different view in the content area:

1. **Schemas** -- Lists all schemas in the library. Shows each schema name, a preview of its DDL text, and compilation status (compiled with ISO 8601 timestamp, or not compiled).

2. **Connections** -- Lists all database connections stored in the library. Shows each connection's name, database type (MySQL, PostgreSQL, MSSQL, SQLite), server hostname, port, and database name.

3. **DDL Editor** -- Displays the DDL text of the active schema with line numbers. Select a schema from the Schemas panel first to set the active schema. The content is scrollable for large DDL files.

4. **Meadow JSON** -- Shows the generated Meadow package JSON for the active compiled schema. Each table has its own JSON block containing column definitions, index configurations, and default record templates. Requires the schema to be compiled first.

5. **Visualizer** -- Renders an ASCII box diagram of the active schema showing tables, columns with type abbreviations (e.g., `INT`, `VCH(200)`), and FK relationships drawn as arrows between tables. Requires the schema to be compiled first.

6. **Deploy** -- Pre-deployment summary showing the active schema and target connection. Lists the tables to be created and provides status messages about the deployment operation.

7. **Migrate** -- Displays diff results between active schemas with `+` and `-` change markers. Shows tables added, tables removed, and columns modified between the source and target schemas.

8. **Script** -- Shows generated migration SQL with line numbers. The SQL is specific to the database type selected during generation (MySQL, PostgreSQL, MSSQL, or SQLite).

9. **Introspect** -- Displays introspection results from a live database connection. Shows discovered tables, columns, types, and foreign key relationships as read from the connected database.

### Loading Libraries

The TUI automatically loads schemas from `.meadow-migration-schemas.json` and connections from `.meadow-migration-connections.json` in the current directory when it starts. Use the CLI commands `add-schema` and `add-connection` to populate these files before launching the TUI.

The schema and connection counts are displayed in the status bar at the bottom of the screen.

---

## Web UI Walkthrough

### Overview

The Web UI is built on Pict views and renders in the browser. It provides the same capabilities as the CLI and TUI with the addition of interactive pict-section-flow diagrams for schema visualization and migration diffing. All views render into a sidebar + content layout managed by the Layout view.

### Layout

The Web UI uses a sidebar navigation layout:

- **Left sidebar** -- Navigation menu with heading "Migration Manager" and links to all views
- **Content area** -- Renders the selected view into the `#MigrationManager-Content` container

The Layout view (`MigrationManager-Layout`) produces the overall HTML structure. Clicking a sidebar link loads the corresponding view into the content area. Each view is a Pict view class with its own templates, CSS, and rendering logic.

### Navigation Items

The sidebar contains nine navigation items, each loading a different view:

1. **Schema Library** -- CRUD operations for managing schemas. Add new schemas from DDL text, view existing schemas with their DDL preview and compilation status (compiled/not compiled with timestamp), and remove schemas from the library. Schema names are listed with their current state.

2. **Connections** -- Manage database connections. Add new connections by specifying a name, database type (MySQL, PostgreSQL, MSSQL, SQLite), server hostname, port, credentials, and database name. View existing connections with their configuration details. Remove connections that are no longer needed.

3. **DDL Editor** -- Text editor view for viewing and editing MicroDDL source text. Displays the DDL content of the active schema. Changes made here update the schema entry in the library.

4. **Meadow Config** -- Read-only display of the generated Meadow package JSON for the active schema. Shows the structured output produced by the MeadowPackageGenerator service after compilation. Requires the schema to be compiled first.

5. **Schema Visualizer** -- Interactive graph and text reference (detailed below).

6. **Schema Deployer** -- Deploy a compiled schema to a live database. Shows a pre-deployment checklist with the active schema and target connection. Lists tables that will be created in the target database and provides status feedback during the deployment process.

7. **Schema Migrator** -- Diff-colored graph and migration controls (detailed below).

8. **Migration Scripts** -- View generated SQL migration scripts with syntax highlighting. Displays the output of the MigrationGenerator service, showing database-specific DDL statements produced from the diff result.

9. **Introspector** -- Connect to a live database and discover its schema. Uses the SchemaIntrospector service with the active connection to read table definitions, column metadata, and foreign key relationships from the running database.

### Schema Visualizer

The Schema Visualizer view provides an interactive pict-section-flow diagram rendered into the `#MigrationManager-SchemaFlow-Container` element:

- **Table nodes** appear in a grid layout (up to 4 columns), with each node using the `TABLE` FlowCard type
- Each node shows the table name in a dark blue-gray (`#2c3e50`) title bar
- **FK columns** have output ports on the right side of their source table node
- **Referenced PK columns** have input ports on the left side of their target table node
- **Connections** draw lines from FK output ports to PK input ports, showing foreign key relationships between tables
- **Toolbar** provides pan, zoom, and auto-layout controls (enabled via `EnableToolbar`, `EnablePanning`, `EnableZooming` in the flow view configuration)
- **Node dragging** allows repositioning tables for clearer visualization (enabled via `EnableNodeDragging`)

Below the flow diagram, two text reference sections are displayed:

- **Table List** -- all tables in the compiled schema with their column counts, generated by the SchemaVisualizer service
- **Relationship Map** -- all FK relationships in text form, showing which columns reference which tables, also generated by the SchemaVisualizer service

### Schema Migrator

The Schema Migrator view shows a diff-colored pict-section-flow diagram rendered into the `#MigrationManager-MigratorFlow-Container` element. The diagram uses four FlowCard node type variants to indicate the diff status of each table:

- **Green nodes** (`TABLE_ADDED`, `#27ae60`) -- tables that exist only in the target schema
- **Red nodes** (`TABLE_REMOVED`, `#c0392b`) -- tables that exist only in the source schema
- **Orange nodes** (`TABLE_MODIFIED`, `#e67e22`) -- tables with column, index, or foreign key changes between source and target
- **Dark nodes** (`TABLE`, `#2c3e50`) -- unchanged tables present in both schemas

A color legend is displayed above the diagram with colored dots and labels for each diff status category (Added, Removed, Modified, Unchanged).

Below the diagram, text diff panels show the details of the changes:

- **Tables to Add** -- lists tables present in the target but not in the source
- **Tables to Remove** -- lists tables present in the source but not in the target
- **Columns Changed** -- lists column-level modifications (added, removed, or altered columns within modified tables)

Two action buttons are provided below the diff panels:

- **Generate Migration Script** -- creates SQL migration statements from the current diff result using the MigrationGenerator service
- **Execute Migration** -- runs the generated migration against the active database connection using the SchemaDeployer service
