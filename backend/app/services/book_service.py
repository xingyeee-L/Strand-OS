import os

class BookService:
    @staticmethod
    def get_available_books():
        """列出 books 目录下的所有文件"""
        # 动态定位 books 目录
        current_dir = os.path.dirname(os.path.abspath(__file__))
        books_dir = os.path.join(current_dir, "../../books")
        
        if not os.path.exists(books_dir):
            return []
            
        return [f for f in os.listdir(books_dir) if f.endswith(".txt")]

    @staticmethod
    def fetch_new_words(book_name: str, start_index: int, count: int = 5) -> list[str]:
        """从指定行数开始，读取 count 个单词"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(current_dir, "../../books", book_name)
        
        words = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                # 简单粗暴：读所有行，然后切片 (文件小的时候没问题，大文件可用 seek)
                # IELTS.txt 也就几千行，全读内存无压力
                all_lines = [line.strip() for line in f if line.strip()]
                
                # 边界检查
                if start_index >= len(all_lines):
                    return [] # 书背完了
                
                words = all_lines[start_index : start_index + count]
        except Exception as e:
            print(f"[BookService] Error reading {book_name}: {e}")
            
        return words