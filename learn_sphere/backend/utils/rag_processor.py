import os
import json
from pathlib import Path
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Tuple
import re
import sys
import logging
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RAGProcessor:
    def __init__(self, prompts_dir: str = "data/prompts"):
        self.prompts_dir = Path(prompts_dir)
        # Initialize the sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.prompts_cache = {}
        self.embeddings_cache = {}
        self._load_prompts()

    def _load_prompts(self):
        """Load all prompts from the prompts directory and compute their embeddings."""
        if not self.prompts_dir.exists():
            return

        for file_path in self.prompts_dir.glob("*.txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    # Parse the content
                    query_match = re.search(r'Query: (.*?)\n\nSolution:', content, re.DOTALL)
                    solution_match = re.search(r'Solution: (.*?)\n\nSubject:', content, re.DOTALL)
                    subject_match = re.search(r'Subject: (.*?)\n', content)
                    
                    if query_match and solution_match and subject_match:
                        query = query_match.group(1).strip()
                        solution = solution_match.group(1).strip()
                        subject = subject_match.group(1).strip()
                        
                        # Store in cache
                        self.prompts_cache[str(file_path)] = {
                            'query': query,
                            'solution': solution,
                            'subject': subject,
                            'content': content
                        }
                        
                        # Compute and store embedding
                        combined_text = f"{query} {solution}"
                        embedding = self.model.encode(combined_text)
                        self.embeddings_cache[str(file_path)] = embedding
            except Exception as e:
                print(f"Error loading prompt from {file_path}: {e}")

    def _compute_similarity(self, query: str, embedding: np.ndarray) -> float:
        """Compute cosine similarity between query and stored embedding."""
        query_embedding = self.model.encode(query)
        return np.dot(query_embedding, embedding) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(embedding)
        )

    def find_relevant_context(self, query: str, subject: str = None, top_k: int = 3) -> List[Dict]:
        """
        Find the most relevant prompts for the given query.
        
        Args:
            query: The user's query
            subject: Optional subject filter
            top_k: Number of most relevant prompts to return
            
        Returns:
            List of dictionaries containing relevant prompts and their metadata
        """
        if not self.prompts_cache:
            return []

        # Compute similarities
        similarities = []
        for file_path, embedding in self.embeddings_cache.items():
            prompt_data = self.prompts_cache[file_path]
            
            # Skip if subject filter is provided and doesn't match
            if subject and prompt_data['subject'].lower() != subject.lower():
                continue
                
            similarity = self._compute_similarity(query, embedding)
            similarities.append((file_path, similarity))

        # Sort by similarity and get top_k results
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_results = similarities[:top_k]

        # Format results
        relevant_contexts = []
        for file_path, similarity in top_results:
            prompt_data = self.prompts_cache[file_path]
            relevant_contexts.append({
                'query': prompt_data['query'],
                'solution': prompt_data['solution'],
                'subject': prompt_data['subject'],
                'similarity_score': float(similarity),
                'content': prompt_data['content']
            })

        return relevant_contexts

    def format_context_for_llm(self, contexts: List[Dict]) -> str:
        """
        Format the relevant contexts into a string that can be used as context for the LLM.
        """
        if not contexts:
            return ""

        formatted_context = "Here are some relevant previous interactions that might help:\n\n"
        
        for i, context in enumerate(contexts, 1):
            formatted_context += f"Previous Interaction {i}:\n"
            formatted_context += f"Query: {context['query']}\n"
            formatted_context += f"Solution: {context['solution']}\n"
            formatted_context += f"Subject: {context['subject']}\n"
            formatted_context += f"Relevance Score: {context['similarity_score']:.2f}\n\n"

        return formatted_context

def process_query_for_llm(query: str, subject: str = None) -> str:
    """
    Process a query using RAG and return formatted context for the LLM.
    
    Args:
        query: The user's query
        subject: Optional subject filter
        
    Returns:
        Formatted context string for the LLM
    """
    rag = RAGProcessor()
    relevant_contexts = rag.find_relevant_context(query, subject)
    return rag.format_context_for_llm(relevant_contexts)

def load_embeddings(subject):
    try:
        # Get the directory of the current script
        current_dir = Path(__file__).parent
        embeddings_path = current_dir / f'embeddings_{subject}.npy'
        texts_path = current_dir / f'texts_{subject}.json'
        
        logger.info(f'Loading embeddings from: {embeddings_path}')
        logger.info(f'Loading texts from: {texts_path}')
        
        if not embeddings_path.exists() or not texts_path.exists():
            logger.warning(f'No existing embeddings found for {subject}')
            return None, []
            
        embeddings = np.load(embeddings_path)
        with open(texts_path, 'r', encoding='utf-8') as f:
            texts = json.load(f)
            
        logger.info(f'Successfully loaded {len(texts)} texts and embeddings')
        return embeddings, texts
    except Exception as e:
        logger.error(f'Error loading embeddings: {str(e)}')
        return None, []

def get_relevant_context(query, subject, top_k=3):
    try:
        logger.info(f'Processing query: {query}')
        logger.info(f'Subject: {subject}')
        
        # Load model
        logger.info('Loading sentence transformer model')
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Load existing embeddings and texts
        embeddings, texts = load_embeddings(subject)
        
        if embeddings is None or len(texts) == 0:
            logger.warning('No existing context found')
            return ''
            
        # Encode query
        logger.info('Encoding query')
        query_embedding = model.encode([query])[0]
        
        # Calculate similarities
        logger.info('Calculating similarities')
        similarities = cosine_similarity([query_embedding], embeddings)[0]
        
        # Get top k most similar texts
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        # Format context
        context = []
        for idx in top_indices:
            similarity = similarities[idx]
            if similarity > 0.5:  # Only include if similarity is above threshold
                text = texts[idx]
                context.append(f"Previous Interaction (Relevance Score: {similarity:.2f}):\nQuery: {text['query']}\nResponse: {text['response']}")
        
        result = '\n\n'.join(context)
        logger.info(f'Found {len(context)} relevant contexts')
        return result
        
    except Exception as e:
        logger.error(f'Error in get_relevant_context: {str(e)}')
        return ''

def main():
    try:
        if len(sys.argv) != 5 or sys.argv[1] != '--query' or sys.argv[3] != '--subject':
            logger.error('Invalid arguments. Usage: python rag_processor.py --query "your query" --subject "subject"')
            print('')
            return
            
        query = sys.argv[2]
        subject = sys.argv[4]
        
        logger.info('\n=== RAG Processing Started ===')
        logger.info(f'Query: {query}')
        logger.info(f'Subject: {subject}')
        
        # Load model
        logger.info('Loading sentence transformer model...')
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Load embeddings and texts
        logger.info('Loading embeddings and texts...')
        embeddings, texts = load_embeddings(subject)
        
        if embeddings is None or len(texts) == 0:
            logger.warning('No existing context found for this subject')
            print('')
            return
            
        logger.info(f'Successfully loaded {len(texts)} texts and embeddings')
        
        # Encode query
        logger.info('Encoding query...')
        query_embedding = model.encode([query])[0]
        
        # Calculate similarities
        logger.info('Calculating similarities...')
        similarities = cosine_similarity([query_embedding], embeddings)[0]
        
        # Get top 3 most similar texts
        top_indices = np.argsort(similarities)[-3:][::-1]
        
        logger.info('\n=== Retrieved Contexts ===')
        context_parts = []
        for idx in top_indices:
            similarity = similarities[idx]
            text = texts[idx]
            logger.info(f'\nContext {len(context_parts) + 1}:')
            logger.info(f'Similarity Score: {similarity:.4f}')
            logger.info(f'Query: {text["query"]}')
            logger.info(f'Response: {text["response"][:200]}...')  # Show first 200 chars
            
            if similarity > 0.5:  # Only include if similarity is above threshold
                context_parts.append(f"Previous Interaction (Relevance Score: {similarity:.4f}):\nQuery: {text['query']}\nResponse: {text['response']}")
        
        if not context_parts:
            logger.info('No relevant contexts found above similarity threshold')
            print('')
            return
            
        final_context = '\n\n'.join(context_parts)
        logger.info('\n=== Final Combined Context ===')
        logger.info(final_context)
        
        print(final_context)
        logger.info('RAG processing completed successfully')
        
    except Exception as e:
        logger.error(f'Error in main: {str(e)}')
        print('')

if __name__ == "__main__":
    main() 