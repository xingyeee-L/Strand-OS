import os
from unittest.mock import MagicMock, patch
from app.services.distiller import distill_text

@patch("app.services.distiller.settings")
def test_distill_text_heuristic(mock_settings):
    mock_settings.DISTILL_MODE = "heuristic"
    text = "Strand OS is a RAG system. It uses knowledge graph. It is very cool."
    result = distill_text(text)
    assert result.startswith("- ")
    assert len(result.splitlines()) >= 1

@patch("app.services.distiller.get_llm")
@patch("app.services.distiller.settings")
def test_distill_text_llm_format(mock_settings, mock_get_llm):
    mock_settings.DISTILL_MODE = "llm"
    mock_llm = MagicMock()
    # 模拟 LLM 返回不带 "- " 的行，验证后置过滤
    mock_llm.invoke.return_value = "Point 1\nPoint 2\n- Point 3"
    mock_get_llm.return_value = mock_llm

    text = "Some long content to distill."
    result = distill_text(text)
    
    lines = result.splitlines()
    for line in lines:
        assert line.startswith("- ")
    assert len(lines) == 3
    assert "Point 1" in lines[0]
    assert "Point 2" in lines[1]
    assert "Point 3" in lines[2]

@patch("app.services.distiller.settings")
def test_distill_text_off(mock_settings):
    mock_settings.DISTILL_MODE = "off"
    text = "Just keep it as is."
    result = distill_text(text)
    assert result == text
