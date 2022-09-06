#!/usr/bin/env python3
# -*- coding: latin-1 -*-
''' 
 Freeciv - Copyright (C) 2009 - Andreas R�sdal   andrearo@pvv.ntnu.no
   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2, or (at your option)
   any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
'''


from os import path
import argparse
import generate_packets
import sys

parser = argparse.ArgumentParser(
  description='Generate .js packet handling dispatcher based on freeciv sources')
parser.add_argument('-f', '--freeciv', required=True, help='path to (original) freeciv project')
parser.add_argument('-o', '--outdir', required=True, help='path to webapp output directory')
args = parser.parse_args()

webapp_dir = args.outdir
freeciv_dir = args.freeciv

javascript_dir = path.join(webapp_dir, 'javascript')
if not path.isdir(javascript_dir):
  sys.exit('Destination javascript directory does not exist: ' + javascript_dir)

packets = generate_packets.gen_main(freeciv_dir)

output_name = path.join(javascript_dir, 'packhand_gen.js')
f = open(output_name, 'w')

f.write(""" /* Generated by generate_js_hand.py */
var packet_hand_table = {""");

for packet in list(packets.values()):
  if not "sc" in packet.dirs: continue;
  f.write("\n  {:3d}:".format(packet.type_number));
  f.write("      handle_" + packet.type.lower().replace("packet_", ""))
  f.write(",");

f.write(""" 
};

function client_handle_packet(p)
{
 if (p == null) return;
 try {
  for (var i = 0; i < p.length; i++) {
    if (p[i] == null) continue;
    var packet_type = p[i]['pid'];

    packet_hand_table[packet_type](p[i]);
  }
 
  if (p.length > 0) {
    if (debug_active) clinet_debug_collect();
  }

 } catch(err) {
   console.error(err); 
 }

}
""");
print("Generated " + output_name)

output_name = path.join(javascript_dir, 'packets.js')
p = open(output_name, 'w');

p.write(" /* Generated by generate_js_hand.py */ \n");
for packet in list(packets.values()):
  if not "cs" in packet.dirs: continue;
  p.write(" var " + packet.type.lower() + " = " + str(packet.type_number) + "\n");
print("Generated " + output_name)
