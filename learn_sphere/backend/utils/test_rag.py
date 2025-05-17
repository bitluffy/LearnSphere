from rag_processor import RAGProcessor
import os

def test_rag_system():
    # Create a test prompt
    test_prompt = "What is the formula for kinetic energy?"
    subject = "physics"
    
    print("Testing RAG System...")
    print(f"Query: {test_prompt}")
    print(f"Subject: {subject}")
    
    # Initialize RAG processor
    rag = RAGProcessor()
    
    # Find relevant context
    contexts = rag.find_relevant_context(test_prompt, subject)
    
    # Print results
    print("\nFound relevant contexts:")
    for i, context in enumerate(contexts, 1):
        print(f"\nContext {i}:")
        print(f"Query: {context['query']}")
        print(f"Solution: {context['solution']}")
        print(f"Subject: {context['subject']}")
        print(f"Similarity Score: {context['similarity_score']:.2f}")
    
    # Format context for LLM
    formatted_context = rag.format_context_for_llm(contexts)
    print("\nFormatted context for LLM:")
    print(formatted_context)

if __name__ == "__main__":
    test_rag_system() 