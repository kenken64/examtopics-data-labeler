#!/usr/bin/env python3

def remove_odd_rows(input_file, output_file=None):
    """
    Remove odd-numbered rows from a text file.
    
    Args:
        input_file (str): Path to the input file
        output_file (str, optional): Path to the output file. If None, overwrites input file.
    """
    if output_file is None:
        output_file = input_file
    
    try:
        with open(input_file, 'r') as f:
            lines = f.readlines()
        
        # Keep only even-numbered rows (0-indexed, so indices 1, 3, 5, etc.)
        even_rows = [lines[i] for i in range(len(lines)) if i % 2 == 1]
        
        with open(output_file, 'w') as f:
            f.writelines(even_rows)
        
        print(f"Removed {len(lines) - len(even_rows)} odd rows from {input_file}")
        print(f"Kept {len(even_rows)} even rows")
        
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_odd_rows("missing_q.txt")