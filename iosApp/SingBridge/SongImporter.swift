import AVFoundation
import Shared
import SwiftUI

@MainActor
final class SongImporter: ObservableObject {
    let library = SongLibrary(initialPlayer: IosAudioPlayer())
    @Published var pickerPresented = false
    private(set) var selectingAudio = true
    private var readTask: Task<Void, Never>?
    private let store = LastSongStore()

    init() {
        library.startReading()
        readTask = Task {
            do {
                if let (saved, url) = try store.load() {
                    let selected = try await prepareAudio(url, name: saved.title)
                    library.selectAudio(audio: selected)
                    library.completeImport(text: saved.lyrics, persist: { nil }) { audio in
                        IosAudioPlayer(uri: audio.uri, durationMs: audio.durationMs)
                    }
                } else { library.finishReading() }
            } catch {
                library.reportError(message: "저장한 곡을 열지 못했습니다. 다시 불러오거나 샘플곡을 사용해 주세요.")
            }
        }
    }

    func useSample() {
        if store.clear() {
            library.useSample(player: IosAudioPlayer())
            store.removeUnusedCopies()
        } else { library.reportError(message: "저장한 곡을 지우지 못했습니다. 다시 시도해 주세요.") }
    }

    private func prepareAudio(_ url: URL, name: String) async throws -> ImportedAudio {
        let asset = AVURLAsset(url: url)
        let duration = try await asset.load(.duration)
        let playable = try await asset.load(.isPlayable)
        let audioTracks = try await asset.loadTracks(withMediaType: .audio)
        let milliseconds = CMTimeGetSeconds(duration) * 1_000
        guard playable, !audioTracks.isEmpty, milliseconds.isFinite,
              milliseconds >= 1, milliseconds < Double(Int64.max) else { throw ImportError.unreadable }
        try Task.checkCancellation()
        return ImportedAudio(
            name: String(name.prefix(200)), uri: url.absoluteString, durationMs: Int64(milliseconds),
            dispose: { [store] in store.discardIfUnused(url) }
        )
    }

    func pickAudio() {
        selectingAudio = true
        pickerPresented = true
    }

    func pickLyrics() {
        selectingAudio = false
        pickerPresented = true
    }

    func receive(_ result: Result<URL, Error>) {
        guard case let .success(url) = result else {
            if case .failure = result {
                library.reportError(message: "파일을 선택하지 못했습니다. 다시 시도해 주세요.")
            }
            return
        }
        let audio = selectingAudio
        library.startReading()
        readTask = Task {
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            do {
                if audio {
                    let destination = try store.destination(for: url)
                    do {
                        try await Task.detached(priority: .userInitiated) {
                            try LastSongStore.copyAudio(from: url, to: destination)
                        }.value
                        let selected = try await prepareAudio(destination, name: url.lastPathComponent)
                        library.selectAudio(audio: selected)
                    } catch {
                        store.discardIfUnused(destination)
                        throw error
                    }
                } else {
                    let text = try await Task.detached(priority: .userInitiated) {
                        let file = try FileHandle(forReadingFrom: url)
                        defer { try? file.close() }
                        var data = Data()
                        while let chunk = try file.read(upToCount: 8_192), !chunk.isEmpty {
                            guard data.count + chunk.count <= 1_048_576 else { throw ImportError.unreadable }
                            data.append(chunk)
                        }
                        guard let text = String(data: data, encoding: .utf8) else { throw ImportError.unreadable }
                        return text
                    }.value
                    try Task.checkCancellation()
                    library.completeImport(text: text, persist: { [store, library] in
                        guard let selected = library.pendingAudio else { return "오디오 파일을 다시 선택해 주세요." }
                        return store.save(audio: selected, lyrics: text)
                    }) { selected in
                        IosAudioPlayer(uri: selected.uri, durationMs: selected.durationMs)
                    }
                }
            } catch {
                library.reportError(message: audio
                    ? "음원을 가져오지 못했습니다. 256 MiB 이하 오디오 파일과 저장 공간을 확인해 주세요."
                    : "LRC를 읽을 수 없습니다. UTF-8로 저장된 1 MiB 이하 파일을 선택해 주세요.")
            }
        }
    }

    deinit { readTask?.cancel() }
}

private enum ImportError: Error {
    case unreadable
}
