from pypdf import PdfReader

from app.models.document import ParsedDocument, SourceParseRequest
from app.services.source_fetcher import FetchResult


class PdfParser:
    def parse(
        self,
        request: SourceParseRequest,
        fetch_result: FetchResult,
    ) -> ParsedDocument:
        reader = PdfReader(str(fetch_result.file_path))
        extracted_text = ""
        excerpt = ""

        return ParsedDocument(
            title=request.title,
            source_url=request.source_url,
            source_domain=fetch_result.source_domain,
            attribution=request.attribution,
            content_hash=fetch_result.content_hash,
            page_count=len(reader.pages),
            extracted_text=extracted_text,
            extracted_excerpt=excerpt,
        )
