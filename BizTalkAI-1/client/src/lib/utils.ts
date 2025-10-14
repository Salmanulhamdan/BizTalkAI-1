import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAinagerName(name: string): string {
  return name.replace(/\.(com|org|net|io|co|app|dev|xyz|tech|ai|me|info|biz|in|uk|us|ca|au|de|fr|jp|cn|br|it|es|nl|se|no|fi|dk|ch|at|be|pl|ru|kr|sg|hk|tw|my|th|ph|vn|id|nz|za|ae|sa|eg|pk|bd|ng|ke|gh)$/i, '');
}
