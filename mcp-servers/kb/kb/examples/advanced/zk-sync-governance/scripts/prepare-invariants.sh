#!/bin/bash

# Check if correct number of arguments are provided
if [ $# -ne 3 ]; then
    echo "Usage: $0 <invariant> <spec> <output.csv>"
    exit 1
fi

# Assign input arguments to variables
search_string=$1
input_file=$2
output_file=$3

# Check if the file exists
if [ ! -f "$input_file" ]; then
    echo "File not found!"
    exit 1
fi

echo -n "" > $output_file

# Extract the functions inside the and block
function_list=$(sed -n "/$search_string = and {/,/}/p" "$input_file" | sed -e '1d' -e '$d' | sed 's/^[[:space:]]*//g' | sed 's/,$//')
port=18100

# Check if the function_list is not empty
if [ -z "$function_list" ]; then
    echo "No functions found in the and block."
else
    # Print each function on a new line
    echo "$function_list" | while IFS= read -r function; do
        echo "$function,$port" >> $output_file
        port=$((port+1))
    done
fi