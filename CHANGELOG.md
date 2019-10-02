# Changelog
All notable changes to this project will be documented in this file.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Updated minimum version of Node to v10.0.0

### Fixed

- Prevent race condition when making dirs by replace
  home-made `mkdirs` function with Node v10's
  `mkdir(path, {recursive: true})` function.

## [0.7.1] - 2019-09-24

### Fixed

- Error when attempting to addData with columns not in schema.
  Now just raises a warning.

## [0.7.0] - 2019-08-29

### Changed

- Changes `getData()` to limit the `limit` field to 1000.
  Also, when `limit === 0`, the default `limit` of 1000 is used.
  This is to fix #34.
- Changes `getGeneralSchema()` to return a `Promise`.
  This fixes a bug in which database objects would crash if module caching did
  not work, see #32.
