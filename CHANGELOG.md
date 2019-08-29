# Changelog
All notable changes to this project will be documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### MAJOR

- Changes `getData()` to limit the `limit` field to 1000.
  Also, when `limit === 0`, the default `limit` of 1000 is used.
  This is to fix #34.
- Changes `getGeneralSchema()` to return a `Promise`.
  This fixes a bug in which database objects would crash if module caching did
  not work, see #32.
