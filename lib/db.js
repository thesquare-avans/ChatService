const config = require("config");
const pg = require("pg");

const pool = new pg.Pool(config.get("db"));

module.exports.query = function (sql) {
	return pool.query(sql);
};

module.exports.escape = require("sql-template-strings");