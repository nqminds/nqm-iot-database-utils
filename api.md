## Modules

<dl>
<dt><a href="#module_sqlite-manager">sqlite-manager</a></dt>
<dd><p>Module to manage the sqlite database.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#DatasetData">DatasetData</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#CommandResult">CommandResult</a> : <code>object</code></dt>
<dd><p>An object the shows the status of a command.</p>
</dd>
<dt><a href="#Resource">Resource</a> : <code>object</code></dt>
<dd><p>An object that describes a Resource/Dataset</p>
</dd>
</dl>

<a name="module_sqlite-manager"></a>

## sqlite-manager
Module to manage the sqlite database.

**Author**: Alexandru Mereacre <mereacre@gmail.com>  

* [sqlite-manager](#module_sqlite-manager)
    * [.openDatabase(path, type, mode)](#module_sqlite-manager.openDatabase) ⇒ <code>object</code>
    * [.closeDatabase(db)](#module_sqlite-manager.closeDatabase) ⇒ <code>object</code>
    * [.createDataset(db, options)](#module_sqlite-manager.createDataset) ⇒ <code>object</code>
    * [.getGeneralSchema(db)](#module_sqlite-manager.getGeneralSchema) ⇒ <code>object</code>
    * [.addData(db, data)](#module_sqlite-manager.addData) ⇒ <code>Promise.&lt;object.&lt;string, int&gt;&gt;</code>
    * ~~[.getDatasetData(db, [filter], [projection], [options])](#module_sqlite-manager.getDatasetData) ⇒ [<code>DatasetData</code>](#DatasetData)~~
    * [.getData(db, [filter], [projection], [options])](#module_sqlite-manager.getData) ⇒ [<code>DatasetData</code>](#DatasetData)
    * [.getDistinct(db, field, [filter])](#module_sqlite-manager.getDistinct) ⇒ [<code>DatasetData</code>](#DatasetData)
    * [.updateData(db, data, [upsert], [throws])](#module_sqlite-manager.updateData) ⇒ [<code>Promise.&lt;CommandResult&gt;</code>](#CommandResult)
    * [.updateDataByQuery(db, query, update)](#module_sqlite-manager.updateDataByQuery) ⇒ <code>object</code>
    * [.truncateResource(db)](#module_sqlite-manager.truncateResource) ⇒ <code>object</code>
    * [.getDatasetDataCount(db, filter)](#module_sqlite-manager.getDatasetDataCount) ⇒ <code>object</code>
    * [.getResource(db, [noThrow])](#module_sqlite-manager.getResource) ⇒ [<code>Promise.&lt;Resource&gt;</code>](#Resource)
    * [.setGeneralSchema(db, schema)](#module_sqlite-manager.setGeneralSchema)

<a name="module_sqlite-manager.openDatabase"></a>

### sqlite-manager.openDatabase(path, type, mode) ⇒ <code>object</code>
Opens a sqlite database. Creates if none exists.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - Returns the promise with the sqlite3 db object from module node-sqlite3  

| Param | Type | Description |
| --- | --- | --- |
| path | <code>string</code> | The path of the db |
| type | <code>string</code> | The type of the db: "file" or "memory" |
| mode | <code>string</code> | The open mode of the db: "w+" or "rw" or "r" |

<a name="module_sqlite-manager.closeDatabase"></a>

### sqlite-manager.closeDatabase(db) ⇒ <code>object</code>
Closes a sqlite database.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The empty promise or error  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3 |

<a name="module_sqlite-manager.createDataset"></a>

### sqlite-manager.createDataset(db, options) ⇒ <code>object</code>
Creates a dataset in the sqlite database.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The id of the dataset created  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>object</code> |  | The sqlite3 db object from module node-sqlite3 |
| options | <code>object</code> |  | details of the dataset to be added |
| [options.basedOnSchema] | <code>string</code> | <code>&quot;\&quot;dataset\&quot;&quot;</code> | the id of the schema on which this resource will be based. |
| [options.derived] | <code>object</code> |  | definition of derived filter, implying this resource is a view on an existing dataset. |
| [options.derived.filter] | <code>object</code> |  | the (read) filter to apply, in mongodb query format,     e.g. `{"temperature": {"$gt": 15}}` will mean that only data with a temperature value greater than 15 will be     available in this view. The filter can be any arbitrarily complex mongodb query. Use the placeholder     `"@@_identity_@@"` to indicate that the identity of the currently authenticated user should be substituted.     For example, if the user `bob@acme.com/tdx.acme.com` is currently authenticated, a filter of `{"username":     "@@_identity_@@"}` will resolve at runtime to `{"username": "bob@acme.com/tdx.acme.com"}`. |
| [options.derived.projection] | <code>object</code> |  | the (read) projection to apply, in mongodb projection format,     e.g. `{"timestamp": 1, "temperature": 1}` implies only the 'timestamp' and 'temperature' properties will be     returned. |
| [options.derived.source] | <code>string</code> |  | the id of the source dataset on which to apply the filters and     projections. |
| [options.derived.writeFilter] | <code>object</code> |  | the write filter to apply, in mongodb query format. This     controls what data can be written to the underlying source dataset. For example, a write filter of     `{"temperature": {"$lt": 40}}` means that attempts to write a temperature value greater than or equal to `40`     will fail. The filter can be any arbitrarily complex mongodb query. |
| [options.derived.writeProjection] | <code>object</code> |  | the write projection to apply, in mongodb projection format.     This controls what properties can be written to the underlying dataset. For example, a write projection of     `{"temperature": 1}` means that only the temperature field can be written, and attempts to write data to other     properties will fail. To allow a view to create new data in the underlying dataset, the primary key fields     must be included in the write projection. |
| [options.description] | <code>string</code> |  | a description for the resource. |
| [options.id] | <code>string</code> |  | the requested ID of the new resource. Must be unique.     Will be auto-generated if omitted (recommended). |
| [options.name] | <code>string</code> |  | the name of the resource. Must be unique in the parent folder. |
| [options.meta] | <code>object</code> |  | a free-form object for storing metadata associated with this resource. |
| [options.parentId] | <code>string</code> |  | the id of the parent resource.     If omitted, will default to the appropriate root folder based on the type of resource being created. |
| [options.provenance] | <code>string</code> |  | a description of the provenance of the resource.     Markdown format is supported. |
| [options.schema] | <code>object</code> |  | optional schema definition. |
| [options.schema.dataSchema] | <code>object</code> |  | data schema definition object. Has TDX object structure. |
| [options.schema.uniqueIndex] | <code>Array.&lt;object&gt;</code> |  | array of key value pairs denoting     the ascending or descending order of the columns. |
| [options.shareMode] | <code>string</code> |  | the share mode assigned to the new resource.     One of [`"pw"`, `"pr"`, `"tr"`], corresponding to:     "public read/write", "public read/trusted write", "trusted only". |
| [options.tags] | <code>Array.&lt;string&gt;</code> |  | a list of tags to associate with the resource. |

**Example** *(create a dataset with give id and schema)*  
```js
 manager.createDataset(db, {
   "id": "12345",
   "schema": {
     "dataSchema": {
       "prop1": {"__tdxType": ["number"]}
     },
     "uniqueIndex": [{"asc": "prop1"}]
   }
 });
```
<a name="module_sqlite-manager.getGeneralSchema"></a>

### sqlite-manager.getGeneralSchema(db) ⇒ <code>object</code>
Returns the general schema.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The general schema object  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |

<a name="module_sqlite-manager.addData"></a>

### sqlite-manager.addData(db, data) ⇒ <code>Promise.&lt;object.&lt;string, int&gt;&gt;</code>
Add data to a dataset resource.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>Promise.&lt;object.&lt;string, int&gt;&gt;</code> - - The promise with the total count of rows added.  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| data | <code>object</code> \| <code>array</code> | The data to add.     Must conform to the schema defined by the resource metadata.     Supports creating an individual document or many documents. |

**Example** *(create an individual document)*  
```js
// returns {"count": 1} if successful
manager.addData(db, {lsoa: "E0000001", count: 398});
```
**Example** *(create multiple documents)*  
```js
manager.addData(db, [
 {lsoa: "E0000001", count: 398},
 {lsoa: "E0000002", count: 1775},
 {lsoa: "E0000005", count: 4533},
]);
```
<a name="module_sqlite-manager.getDatasetData"></a>

### ~~sqlite-manager.getDatasetData(db, [filter], [projection], [options]) ⇒ [<code>DatasetData</code>](#DatasetData)~~
***Deprecated***

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The id of the dataset-based resource. |
| [filter] | <code>object</code> | A mongodb filter object. If omitted, all data will be retrieved. |
| [projection] | <code>object</code> | A mongodb projection object. Should be used to restrict the payload to the minimum properties needed if a lot of data is being retrieved. |
| [options] | <code>object</code> | A mongodb options object. Can be used to limit, skip, sort etc. Note a default `limit` of 1000 is applied if none is given here. |
| [options.nqmMeta] | <code>bool</code> | When set, the resource metadata will be returned along with the dataset data. Can be used to avoid a second call to `getResource`. Otherwise a URL to the metadata is provided. |

<a name="module_sqlite-manager.getData"></a>

### sqlite-manager.getData(db, [filter], [projection], [options]) ⇒ [<code>DatasetData</code>](#DatasetData)
Gets all data from the given dataset that matches the filter provided.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| [filter] | <code>object</code> | A mongodb filter object. If omitted, all data will be retrieved. |
| [projection] | <code>object</code> | A mongodb projection object. Should be used to restrict the payload to the minimum properties needed if a lot of data is being retrieved. |
| [options] | <code>object</code> | A mongodb options object. Can be used to limit, skip, sort etc. Note a default `limit` of 1000 is applied if none is given here. |
| [options.skip] | <code>number</code> | Number of documents to skip. |
| [options.limit] | <code>number</code> | Limit number of documents to output. |
| [options.sort] | <code>number</code> | Sorting object by schema keys:    e.g. `{prop1: 1, prop2: -1}`, where `1` = ascending, `-1` = descending. |
| [options.nqmMeta] | <code>boolean</code> | When set, the resource metadata will be returned along with the dataset data. Can be used to avoid a second call to `getResource`. Otherwise a URL to the metadata is provided. |

<a name="module_sqlite-manager.getDistinct"></a>

### sqlite-manager.getDistinct(db, field, [filter]) ⇒ [<code>DatasetData</code>](#DatasetData)
Gets all distincts keys for a given field and filter.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| field | <code>string</code> | The sqlite3 field. |
| [filter] | <code>object</code> | A mongodb filter object. If omitted, all data will be retrieved. |

<a name="module_sqlite-manager.updateData"></a>

### sqlite-manager.updateData(db, data, [upsert], [throws]) ⇒ [<code>Promise.&lt;CommandResult&gt;</code>](#CommandResult)
Updates data in a dataset resource.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: [<code>Promise.&lt;CommandResult&gt;</code>](#CommandResult) - - Use the result property to check for
    errors.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>object</code> |  | The sqlite3 db object from module node-sqlite3. |
| data | <code>object</code> \| <code>array.&lt;object&gt;</code> |  | The data to update.     Must conform to the schema defined by the resource metadata.     Supports updating individual or multiple rows. |
| [upsert] | <code>bool</code> | <code>false</code> | Indicates the data should be created if no     document/row is found matching the primary key. |
| [throws] | <code>bool</code> | <code>true</code> | Indicates whether this function should reject     if there is an error. The TDX-API doesn't, as it returns a field which     states if there has been an error. |

<a name="module_sqlite-manager.updateDataByQuery"></a>

### sqlite-manager.updateDataByQuery(db, query, update) ⇒ <code>object</code>
Updates data in a dataset-based resource using a query to specify the documents to be updated.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The promise with the total count of rows updated.  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| query | <code>object</code> | The query that specifies the data to update. All documents matching the query will be updated. |
| update | <code>object</code> | The update object with field data to be replaced. |

**Example** *(updates multiple documents)*  
```js
// Update all documents with English lsoa, setting `count` to 1000.
manager.updateDataByQuery(db, {lsoa: {$regex: "E*"}}, {count: 1000});
```
<a name="module_sqlite-manager.truncateResource"></a>

### sqlite-manager.truncateResource(db) ⇒ <code>object</code>
Truncates the dataset resource.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The promise with the total count of rows deleted.  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |

<a name="module_sqlite-manager.getDatasetDataCount"></a>

### sqlite-manager.getDatasetDataCount(db, filter) ⇒ <code>object</code>
Gets a count of the data in a dataset-based resource, after applying the given filter.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Returns**: <code>object</code> - - The promise with the total count of rows.  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| filter | <code>object</code> | An optional mongodb filter to apply before counting the data. |

<a name="module_sqlite-manager.getResource"></a>

### sqlite-manager.getResource(db, [noThrow]) ⇒ [<code>Promise.&lt;Resource&gt;</code>](#Resource)
Gets the details for a given database.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  
**Throws**:

- Will throw/reject if the resource is not found (see `noThrow` flag) or permission is denied.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| db | <code>object</code> |  | The sqlite3 db object from module node-sqlite3. |
| [noThrow] | <code>bool</code> | <code>false</code> | If set, the call won't reject or throw if the resource doesn't exist. |

<a name="module_sqlite-manager.setGeneralSchema"></a>

### sqlite-manager.setGeneralSchema(db, schema)
Sets the general schema and the default NULL array.

**Kind**: static method of [<code>sqlite-manager</code>](#module_sqlite-manager)  

| Param | Type | Description |
| --- | --- | --- |
| db | <code>object</code> | The sqlite3 db object from module node-sqlite3. |
| schema | <code>object</code> | The general schema. |

<a name="DatasetData"></a>

## DatasetData : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| metaData | <code>object</code> | The dataset metadata (see `nqmMeta` option in `getDatasetData`). |
| metaDataUrl | <code>string</code> | The URL to the dataset metadata (see `nqmMeta` option in `getDatasetData`). |
| data | <code>Array.&lt;object&gt;</code> | The dataset documents. |

<a name="CommandResult"></a>

## CommandResult : <code>object</code>
An object the shows the status of a command.

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| commandId | <code>string</code> | The auto-generated unique id of the command. |
| response | <code>object</code> \| <code>string</code> | The response of the command.     If a command is sent asynchronously, this will     simply be the string `"ack"`.     In synchronous mode, this will usually be an object consisting of the     primary key of the data that was affected by the command. |
| result | <code>object</code> | Contains detailed error information     when available. |
| result.errors | <code>array</code> | Will contain error information     when appropriate. |
| result.commit | <code>array</code> | Contains details of each     committed document. |

<a name="Resource"></a>

## Resource : <code>object</code>
An object that describes a Resource/Dataset

**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| description | <code>string</code> |  |
| id | <code>string</code> | The unique ID of the resource |
| name | <code>string</code> |  |
| parents | <code>Array.&lt;string&gt;</code> |  |
| schemaDefinition | <code>object</code> |  |
| tags | <code>Array.&lt;string&gt;</code> |  |

