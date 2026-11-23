with open('e:\\MY PRO VS code\\DAWAK-pharmacy\\src\\index.css', 'r', encoding='utf8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    # Replace each bronze color variable
    new_line = line
    replacements = {
        '--bronze-main: #333333;': '--forest-main: #18251D;',
        '--bronze-deep: #2a2a2a;': '--forest-deep: #1f3026;',
        '--bronze-card: #404040;': '--forest-card: #22352a;',
        '--bronze-card-raised: #4a4a4a;': '--forest-card-raised: #22352a;',
        '--bronze-soft: #404040;': '--forest-soft: #263b2f;',
        '--bronze-accent: #B08D56;': '--accent-mint: #B7FF72;',
        '--bronze-accent-hover: #9a7a48;': '--accent-mint-hover: #9ee858;',
        '--bronze-accent-soft: rgba(176, 141, 86, 0.16);': '--accent-mint-soft: rgba(183, 255, 114, 0.16);',
        '--bronze-accent-border: rgba(176, 141, 86, 0.32);': '--accent-mint-border: rgba(183, 255, 114, 0.32);',
        '--on-bronze: #222222;': '--on-accent: #122419;',
        '--text-primary: #F5F5F5;': '--text-primary: #f2fbf6;',
        '--text-secondary: #999999;': '--text-secondary: #a5c4b3;',
        '--text-muted: rgba(153, 153, 153, 0.82)': '--text-muted: rgba(165, 196, 179, 0.82)',
        '--ink: #F5F5F5;': '--ink: #f2fbf6;',
        '--main-bg: #333333;': '--main-bg: #18251D;',
        '--card-bg: #404040;': '--card-bg: #1f3026;',
        '--input-bg: #4a4a4a;': '--input-bg: #263b2f;',
        '--card-border: rgba(176, 141, 86, 0.16)': '--card-border: rgba(183, 255, 114, 0.16)',
        '--dark-bg: #333333;': '--dark-bg: #18251D;',
        '--dark-card: #404040;': '--dark-card: #1f3026;',
        '--dark-card-raised: #4a4a4a;': '--dark-card-raised: #22352a;',
        '--dark-header: #333333;': '--dark-header: #18251D;',
        '--dark-on-header: #F5F5F5;': '--dark-on-header: #f2fbf6;',
        '--dark-text: #F5F5F5;': '--dark-text: #f2fbf6;',
        '--dark-text-muted: rgba(153, 153, 153, 0.82)': '--dark-text-muted: rgba(165, 196, 179, 0.82)',
        '--dark-border: rgba(176, 141, 86, 0.16)': '--dark-border: rgba(183, 255, 114, 0.16)',
        '--bronze: #B08D56;': '--forest: #18251D;',
        '--bronze-strong: #9a7a48;': '--acid-mint: #B7FF72;',
    }
    for old, new in replacements.items():
        if old in new_line:
            new_line = new_line.replace(old, new)
    new_lines.append(new_line)

with open('e:\\MY PRO VS code\\DAWAK-pharmacy\\src\\index.css', 'w', encoding='utf8') as f:
    f.writelines(new_lines)
print('Done')