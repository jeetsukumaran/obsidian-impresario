// Embedding or transclusion printing capabilities are based on code originally
// written and generously shared by [Matthew Meyers](http://matthewmeye.rs):
// [Easy Bake](https://github.com/mgmeyers/obsidian-easy-bake/tree/master)
// under the terms of the GNU GPL 3.0 license.

import {
    Plugin
} from 'obsidian';

export interface BakeSettings {
  bakeLinks: boolean;
  bakeEmbeds: boolean;
  bakeInList: boolean;
  convertFileLinks: boolean;
}


