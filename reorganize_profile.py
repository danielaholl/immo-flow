#!/usr/bin/env python3

file_path = "apps/web/app/profile/page.tsx"

with open(file_path, 'r') as f:
    lines = f.readlines()

# Extract sections (0-indexed, so subtract 1 from line numbers)
before_sections = lines[:750-1]  # Everything before line 750
meine_inserate = lines[750-1:856-1]  # Lines 750-855
trennlinie1 = lines[856-1:859-1]  # Lines 856-858
ai_suchprofil = lines[859-1:1008-1]  # Lines 859-1007
trennlinie2 = lines[1008-1:1011-1]  # Lines 1008-1010
suchhistorie = lines[1011-1:1105-1]  # Lines 1011-1104
trennlinie3 = lines[1105-1:1108-1]  # Lines 1105-1107
favoriten_and_rest = lines[1108-1:]  # Lines 1108 to end

# Reorganize: AI Suchprofil, Suchhistorie, Meine Inserate, Favoriten
new_lines = (
    before_sections +
    ai_suchprofil +
    trennlinie1 +
    suchhistorie +
    trennlinie2 +
    meine_inserate +
    trennlinie3 +
    favoriten_and_rest
)

with open(file_path, 'w') as f:
    f.writelines(new_lines)

print("Profile page reorganized successfully!")
