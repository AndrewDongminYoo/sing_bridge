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
    var onImported: (() -> Void)?

    init() {
        library.startReading()
        readTask = Task {
            do {
                if let (saved, url) = try store.load() {
                    let selected = try await prepareAudio(url, name: saved.title)
                    library.selectAudio(audio: selected)
                    try await completePreparedImport(text: saved.lyrics)
                } else { library.finishReading() }
            } catch {
                library.reportError(message: "저장한 곡을 열지 못했습니다. 다시 불러오거나 샘플곡을 사용해 주세요.")
            }
        }
    }

    private func completePreparedImport(text: String, save: Bool = false) async throws {
        guard let audio = library.pendingAudio else { throw ImportError.unreadable }
        library.startReading()
        let player = IosAudioPlayer(uri: audio.uri, durationMs: audio.durationMs)
        var handedToLibrary = false
        defer { if !handedToLibrary { player.release() } }
        for _ in 0..<200 {
            try Task.checkCancellation()
            let playback = player.snapshot()
            guard playback.error == nil else { throw ImportError.playbackNotReady }
            if playback.isReady {
                library.completeImport(text: text, persist: { [store] in
                    save ? store.save(audio: audio, lyrics: text) : nil
                }) { _ in
                    handedToLibrary = true
                    return player
                }
                if save && library.error == nil && library.pendingAudio == nil { onImported?() }
                return
            }
            try await Task.sleep(nanoseconds: 50_000_000)
        }
        throw ImportError.playbackNotReady
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
                    try await completePreparedImport(text: text, save: true)
                    if library.error == nil && library.pendingAudio == nil { store.removeUnusedCopies() }
                }
            } catch ImportError.playbackNotReady {
                library.reportError(message: "음원을 재생할 수 없습니다. 다른 오디오 파일을 선택해 주세요.")
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
    case playbackNotReady
}
