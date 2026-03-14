import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, UploadFile
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlmodel import Session, select

from app.config.database import DISTILLED_BRAIN_PATH, RAW_ARCHIVE_PATH, get_session, get_vector_store
from app.config.settings import settings
from app.models.schemas import KnowledgeFragment, NoteRequest, Source
from app.services.distiller import distill_text
from app.services.semantic_chunker import semantic_chunk_text

router = APIRouter()


def upload_to_gcs(file_obj, filename: str):
    if not settings.GCS_BUCKET:
        return None

    try:
        from google.cloud import storage

        if settings.GOOGLE_APPLICATION_CREDENTIALS:
            client = storage.Client.from_service_account_json(settings.GOOGLE_APPLICATION_CREDENTIALS)
        else:
            client = storage.Client()

        bucket = client.bucket(settings.GCS_BUCKET)
        blob = bucket.blob(f"{settings.GCS_PREFIX}/{filename}")

        file_obj.seek(0)
        blob.upload_from_file(file_obj)
        return f"gs://{settings.GCS_BUCKET}/{settings.GCS_PREFIX}/{filename}"
    except Exception as e:
        print(f"[GCS Upload Error] {e}")
        return None


@router.post("/node/note")
def update_node_note(req: NoteRequest, session: Session = Depends(get_session)):
    note_source = f"NOTE:{req.word_id}"

    fragment = session.exec(select(KnowledgeFragment).where(KnowledgeFragment.source_file == note_source)).first()

    vector_store = get_vector_store()

    if fragment:
        fragment.content = req.note_content
        fragment.fragment_type = fragment.fragment_type or "NOTE"
        if not fragment.embedding_id:
            fragment.embedding_id = str(uuid.uuid4())

        doc = Document(page_content=req.note_content, metadata={"source": note_source, "word_id": req.word_id})
        vector_store.add_documents(documents=[doc], ids=[fragment.embedding_id])
    else:
        new_id = str(uuid.uuid4())
        fragment = KnowledgeFragment(
            content=req.note_content,
            source_file=note_source,
            embedding_id=new_id,
            fragment_type="NOTE",
        )
        doc = Document(page_content=req.note_content, metadata={"source": note_source, "word_id": req.word_id})
        vector_store.add_documents(documents=[doc], ids=[new_id])

    session.add(fragment)
    session.commit()

    return {"status": "success", "embedding_id": fragment.embedding_id}


@router.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...), session: Session = Depends(get_session)):
    raw_id = uuid.uuid4().hex
    raw_filename = f"{raw_id}_{file.filename}"

    gcs_uri = upload_to_gcs(file.file, raw_filename)

    if gcs_uri:
        storage_uri = gcs_uri
        file.file.seek(0)
        raw_path = os.path.join(RAW_ARCHIVE_PATH, raw_filename)
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        raw_path = os.path.join(RAW_ARCHIVE_PATH, raw_filename)
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        storage_uri = raw_path

    source = Source(
        original_filename=file.filename,
        content_type=getattr(file, "content_type", None),
        storage_uri=storage_uri,
    )
    session.add(source)
    session.flush()

    docs = []
    try:
        if file.filename.endswith(".pdf"):
            loader = PyPDFLoader(raw_path)
            docs = loader.load()
        elif file.filename.endswith(".txt") or file.filename.endswith(".md"):
            loader = TextLoader(raw_path, encoding="utf-8")
            docs = loader.load()
    except Exception as e:
        return {"status": "error", "message": str(e)}

    if settings.SEMANTIC_CHUNKING:
        splits: list[Document] = []
        for d in docs:
            for c in semantic_chunk_text(d.page_content, target_chars=700, max_chars=900):
                splits.append(Document(page_content=c, metadata=d.metadata))
    else:
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        splits = splitter.split_documents(docs)

    distilled_chunks = []
    chroma_docs = []
    chroma_ids = []

    for index, split in enumerate(splits):
        raw_source = f"RAW:{raw_filename}#{index}"
        distilled_source = f"DISTILLED:{raw_filename}#{index}"

        raw_frag = KnowledgeFragment(
            content=split.page_content,
            source_file=raw_source,
            fragment_type="RAW",
            source_id=source.id,
        )
        session.add(raw_frag)

        distilled = distill_text(split.page_content)
        distilled_chunks.append(distilled)

        embedding_id = uuid.uuid4().hex
        distilled_frag = KnowledgeFragment(
            content=distilled,
            source_file=distilled_source,
            embedding_id=embedding_id,
            fragment_type="DISTILLED",
            source_id=source.id,
        )
        session.add(distilled_frag)

        doc = Document(
            page_content=distilled,
            metadata={
                "source": raw_filename,
                "raw_path": raw_path,
                "fragment_type": "distilled",
                "chunk_index": index,
                "original_filename": file.filename,
                "source_id": source.id,
            },
        )
        chroma_docs.append(doc)
        chroma_ids.append(embedding_id)

    if chroma_docs:
        get_vector_store().add_documents(documents=chroma_docs, ids=chroma_ids)

    session.commit()

    distilled_doc_path = os.path.join(DISTILLED_BRAIN_PATH, f"{raw_id}_{file.filename}.md")
    with open(distilled_doc_path, "w", encoding="utf-8") as f:
        f.write("\n\n".join(distilled_chunks))

    return {
        "status": "success",
        "raw_id": raw_id,
        "raw_filename": raw_filename,
        "distilled_path": distilled_doc_path,
        "chunks": len(splits),
    }

